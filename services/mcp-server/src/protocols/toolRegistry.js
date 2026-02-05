'use strict';

const { z } = require('zod');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.metrics = new Map();
    this.middlewares = [];
  }

  /**
   * Register a tool with the registry
   * @param {object} toolModule - Module containing toolDefinition, handler, and inputSchema
   */
  register(toolModule) {
    const { toolDefinition, handler, inputSchema } = toolModule;

    if (!toolDefinition || !toolDefinition.name) {
      throw new Error('Tool must have a valid toolDefinition with a name');
    }

    if (typeof handler !== 'function') {
      throw new Error(`Tool "${toolDefinition.name}" must have a handler function`);
    }

    if (this.tools.has(toolDefinition.name)) {
      throw new Error(`Tool "${toolDefinition.name}" is already registered`);
    }

    this.tools.set(toolDefinition.name, {
      definition: toolDefinition,
      handler,
      inputSchema: inputSchema || null,
      registeredAt: new Date().toISOString()
    });

    // Initialize metrics for this tool
    this.metrics.set(toolDefinition.name, {
      invocations: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0,
      avgDuration: 0,
      lastInvoked: null,
      lastError: null
    });

    console.log(`[ToolRegistry] Registered tool: ${toolDefinition.name}`);
  }

  /**
   * Add middleware that runs before tool invocation
   * @param {function} middleware - Async function (toolName, params, context) => void
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
  }

  /**
   * List all registered tools with their definitions
   * @returns {Array} Array of tool definitions
   */
  listTools() {
    const tools = [];
    for (const [name, tool] of this.tools) {
      tools.push({
        name,
        description: tool.definition.description,
        inputSchema: tool.definition.inputSchema,
        outputSchema: tool.definition.outputSchema || null,
        restricted: tool.definition.restricted || false,
        requiredPermissions: tool.definition.requiredPermissions || [],
        registeredAt: tool.registeredAt
      });
    }
    return tools;
  }

  /**
   * Get a specific tool's schema
   * @param {string} name - Tool name
   * @returns {object|null} Tool schema or null
   */
  getToolSchema(name) {
    const tool = this.tools.get(name);
    if (!tool) return null;

    return {
      name,
      description: tool.definition.description,
      inputSchema: tool.definition.inputSchema,
      outputSchema: tool.definition.outputSchema || null,
      restricted: tool.definition.restricted || false,
      requiredPermissions: tool.definition.requiredPermissions || []
    };
  }

  /**
   * Check if a tool exists
   * @param {string} name - Tool name
   * @returns {boolean}
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Invoke a tool by name with given parameters
   * @param {string} name - Tool name
   * @param {object} params - Input parameters
   * @param {object} context - Context containing db, redis, etc.
   * @param {object} options - Invocation options
   * @returns {object} Tool result
   */
  async invoke(name, params, context, options = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(`Tool "${name}" not found`);
    }

    const metrics = this.metrics.get(name);
    const startTime = Date.now();
    const timeout = options.timeout || 30000; // Default 30s timeout

    try {
      // Run middlewares
      for (const middleware of this.middlewares) {
        await middleware(name, params, context);
      }

      // Validate input if schema exists
      if (tool.inputSchema) {
        try {
          tool.inputSchema.parse(params);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const errors = validationError.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }));
            throw new ValidationError(
              `Input validation failed for tool "${name}"`,
              errors
            );
          }
          throw validationError;
        }
      }

      // Execute with timeout
      const result = await Promise.race([
        tool.handler(params, context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new TimeoutError(`Tool "${name}" timed out after ${timeout}ms`)), timeout)
        )
      ]);

      // Update metrics
      const duration = Date.now() - startTime;
      metrics.invocations++;
      metrics.successes++;
      metrics.totalDuration += duration;
      metrics.avgDuration = Math.round(metrics.totalDuration / metrics.invocations);
      metrics.lastInvoked = new Date().toISOString();

      return {
        tool: name,
        status: 'success',
        duration,
        ...result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.invocations++;
      metrics.failures++;
      metrics.totalDuration += duration;
      metrics.avgDuration = Math.round(metrics.totalDuration / metrics.invocations);
      metrics.lastInvoked = new Date().toISOString();
      metrics.lastError = {
        message: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      };

      if (error instanceof ToolNotFoundError ||
          error instanceof ValidationError ||
          error instanceof TimeoutError) {
        throw error;
      }

      throw new ToolExecutionError(
        `Tool "${name}" execution failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Get metrics for all tools or a specific tool
   * @param {string} [name] - Optional tool name
   * @returns {object} Metrics data
   */
  getMetrics(name) {
    if (name) {
      const metrics = this.metrics.get(name);
      if (!metrics) return null;
      return { [name]: metrics };
    }

    const allMetrics = {};
    for (const [toolName, metric] of this.metrics) {
      allMetrics[toolName] = metric;
    }
    return allMetrics;
  }

  /**
   * Reset metrics for all tools or a specific tool
   * @param {string} [name] - Optional tool name
   */
  resetMetrics(name) {
    const resetObj = {
      invocations: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0,
      avgDuration: 0,
      lastInvoked: null,
      lastError: null
    };

    if (name) {
      if (this.metrics.has(name)) {
        this.metrics.set(name, { ...resetObj });
      }
    } else {
      for (const [toolName] of this.metrics) {
        this.metrics.set(toolName, { ...resetObj });
      }
    }
  }

  /**
   * Get server status summary
   * @returns {object} Status summary
   */
  getStatus() {
    const allMetrics = this.getMetrics();
    let totalInvocations = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const metric of Object.values(allMetrics)) {
      totalInvocations += metric.invocations;
      totalSuccesses += metric.successes;
      totalFailures += metric.failures;
    }

    return {
      total_tools: this.tools.size,
      total_invocations: totalInvocations,
      total_successes: totalSuccesses,
      total_failures: totalFailures,
      success_rate: totalInvocations > 0
        ? parseFloat(((totalSuccesses / totalInvocations) * 100).toFixed(2))
        : 100,
      tools: this.listTools().map(t => t.name),
      metrics: allMetrics
    };
  }
}

// Custom Error Classes
class ToolNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolNotFoundError';
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
    this.statusCode = 408;
  }
}

class ToolExecutionError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ToolExecutionError';
    this.statusCode = 500;
    this.cause = cause;
  }
}

module.exports = {
  ToolRegistry,
  ToolNotFoundError,
  ValidationError,
  TimeoutError,
  ToolExecutionError
};
