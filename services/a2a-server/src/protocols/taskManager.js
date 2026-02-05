'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Task status constants
 */
const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Task priority constants
 */
const TaskPriority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  CRITICAL: 10
};

class TaskManager {
  constructor({ agentRegistry, broadcastFn, db, redis }) {
    this.agentRegistry = agentRegistry;
    this.broadcast = broadcastFn || (() => {});
    this.db = db;
    this.redis = redis;
    this.tasks = new Map();
    this.taskQueue = [];
    this.processing = false;
    this.maxConcurrent = 10;
    this.activeTasks = 0;
  }

  /**
   * Create a new task and assign it to the appropriate agent
   * @param {object} taskInput - Task creation input
   * @returns {object} Created task
   */
  async createTask(taskInput) {
    const {
      agentId,
      query,
      params = {},
      priority = TaskPriority.NORMAL,
      metadata = {},
      callbackUrl = null
    } = taskInput;

    // Validate agent exists
    if (agentId) {
      const agent = this.agentRegistry.getAgent(agentId);
      if (!agent) {
        throw new TaskError(`Agent "${agentId}" not found`, 404);
      }
    }

    // Determine the best agent if not specified
    const assignedAgentId = agentId || this.agentRegistry.routeTask(query, params);
    if (!assignedAgentId) {
      throw new TaskError('No suitable agent found for this task', 400);
    }

    const task = {
      id: uuidv4(),
      agentId: assignedAgentId,
      status: TaskStatus.PENDING,
      priority,
      query,
      params,
      metadata,
      callbackUrl,
      result: null,
      error: null,
      history: [
        {
          status: TaskStatus.PENDING,
          timestamp: new Date().toISOString(),
          message: 'Task created'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.tasks.set(task.id, task);

    // Store in Redis if available
    await this._cacheTask(task);

    // Broadcast task creation
    this.broadcast({
      type: 'task_created',
      taskId: task.id,
      agentId: assignedAgentId,
      status: task.status,
      timestamp: task.createdAt
    });

    // Add to queue and process
    this._enqueue(task);
    this._processQueue();

    return {
      id: task.id,
      agentId: task.agentId,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt
    };
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {object|null} Task or null
   */
  async getTask(taskId) {
    // Check in-memory first
    let task = this.tasks.get(taskId);

    // Try Redis cache
    if (!task && this.redis) {
      try {
        const cached = await this.redis.get(`a2a:task:${taskId}`);
        if (cached) {
          task = JSON.parse(cached);
          this.tasks.set(taskId, task);
        }
      } catch (err) {
        console.warn('[TaskManager] Redis read failed:', err.message);
      }
    }

    return task || null;
  }

  /**
   * Cancel a task
   * @param {string} taskId - Task ID
   * @returns {object} Updated task
   */
  async cancelTask(taskId) {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new TaskError(`Task "${taskId}" not found`, 404);
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new TaskError('Cannot cancel a completed task', 400);
    }

    if (task.status === TaskStatus.CANCELLED) {
      throw new TaskError('Task is already cancelled', 400);
    }

    task.status = TaskStatus.CANCELLED;
    task.updatedAt = new Date().toISOString();
    task.completedAt = new Date().toISOString();
    task.history.push({
      status: TaskStatus.CANCELLED,
      timestamp: new Date().toISOString(),
      message: 'Task cancelled by user'
    });

    this.tasks.set(taskId, task);
    await this._cacheTask(task);

    // Broadcast cancellation
    this.broadcast({
      type: 'task_cancelled',
      taskId: task.id,
      agentId: task.agentId,
      timestamp: task.updatedAt
    });

    return task;
  }

  /**
   * Get all tasks with optional filtering
   * @param {object} filters - Optional filters
   * @returns {Array} Filtered tasks
   */
  async listTasks(filters = {}) {
    let tasks = Array.from(this.tasks.values());

    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters.agentId) {
      tasks = tasks.filter(t => t.agentId === filters.agentId);
    }

    // Sort by priority (desc) then by creation time (asc)
    tasks.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks.map(t => ({
      id: t.id,
      agentId: t.agentId,
      status: t.status,
      priority: t.priority,
      query: t.query,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt
    }));
  }

  /**
   * Add task to priority queue
   * @private
   */
  _enqueue(task) {
    this.taskQueue.push(task);
    // Sort queue by priority (higher priority first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Process tasks from the queue
   * @private
   */
  async _processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.taskQueue.length > 0 && this.activeTasks < this.maxConcurrent) {
        const task = this.taskQueue.shift();
        if (!task || task.status === TaskStatus.CANCELLED) continue;

        this.activeTasks++;
        // Fire and forget - process concurrently
        this._executeTask(task).finally(() => {
          this.activeTasks--;
          // Continue processing remaining queue
          if (this.taskQueue.length > 0) {
            this._processQueue();
          }
        });
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a single task
   * @private
   */
  async _executeTask(task) {
    try {
      // Update status to in_progress
      task.status = TaskStatus.IN_PROGRESS;
      task.startedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
      task.history.push({
        status: TaskStatus.IN_PROGRESS,
        timestamp: task.startedAt,
        message: `Task assigned to agent: ${task.agentId}`
      });

      this.tasks.set(task.id, task);
      await this._cacheTask(task);

      // Broadcast in_progress
      this.broadcast({
        type: 'task_in_progress',
        taskId: task.id,
        agentId: task.agentId,
        timestamp: task.startedAt
      });

      // Get the agent and execute
      const agent = this.agentRegistry.getAgent(task.agentId);
      if (!agent) {
        throw new Error(`Agent "${task.agentId}" not found during execution`);
      }

      const context = {
        db: this.db,
        redis: this.redis,
        taskId: task.id,
        metadata: task.metadata
      };

      const result = await agent.handler(
        { query: task.query, ...task.params },
        context
      );

      // Check if task was cancelled during execution
      const currentTask = this.tasks.get(task.id);
      if (currentTask && currentTask.status === TaskStatus.CANCELLED) {
        return;
      }

      // Update to completed
      task.status = TaskStatus.COMPLETED;
      task.result = result;
      task.completedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
      task.history.push({
        status: TaskStatus.COMPLETED,
        timestamp: task.completedAt,
        message: 'Task completed successfully'
      });

      this.tasks.set(task.id, task);
      await this._cacheTask(task);

      // Broadcast completion
      this.broadcast({
        type: 'task_completed',
        taskId: task.id,
        agentId: task.agentId,
        result: task.result,
        timestamp: task.completedAt
      });

      // Send callback if specified
      if (task.callbackUrl) {
        this._sendCallback(task).catch(err => {
          console.error(`[TaskManager] Callback failed for task ${task.id}:`, err.message);
        });
      }

    } catch (error) {
      console.error(`[TaskManager] Task ${task.id} failed:`, error.message);

      task.status = TaskStatus.FAILED;
      task.error = {
        message: error.message,
        type: error.name,
        timestamp: new Date().toISOString()
      };
      task.completedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
      task.history.push({
        status: TaskStatus.FAILED,
        timestamp: task.completedAt,
        message: `Task failed: ${error.message}`
      });

      this.tasks.set(task.id, task);
      await this._cacheTask(task);

      // Broadcast failure
      this.broadcast({
        type: 'task_failed',
        taskId: task.id,
        agentId: task.agentId,
        error: error.message,
        timestamp: task.completedAt
      });
    }
  }

  /**
   * Cache task in Redis
   * @private
   */
  async _cacheTask(task) {
    if (!this.redis) return;
    try {
      await this.redis.setEx(
        `a2a:task:${task.id}`,
        3600, // 1 hour TTL
        JSON.stringify(task)
      );
    } catch (err) {
      console.warn('[TaskManager] Redis cache write failed:', err.message);
    }
  }

  /**
   * Send callback notification for completed tasks
   * @private
   */
  async _sendCallback(task) {
    const axios = require('axios');
    await axios.post(task.callbackUrl, {
      taskId: task.id,
      agentId: task.agentId,
      status: task.status,
      result: task.result,
      error: task.error,
      completedAt: task.completedAt
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get task manager statistics
   * @returns {object} Statistics
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    const statusCounts = {};
    for (const status of Object.values(TaskStatus)) {
      statusCounts[status] = tasks.filter(t => t.status === status).length;
    }

    return {
      total_tasks: tasks.length,
      queued_tasks: this.taskQueue.length,
      active_tasks: this.activeTasks,
      max_concurrent: this.maxConcurrent,
      status_breakdown: statusCounts
    };
  }
}

class TaskError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'TaskError';
    this.statusCode = statusCode;
  }
}

module.exports = { TaskManager, TaskStatus, TaskPriority, TaskError };
