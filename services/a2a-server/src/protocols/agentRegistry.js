'use strict';

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.healthChecks = new Map();
    this.routingRules = [];
  }

  /**
   * Register an agent with its card and handler
   * @param {object} agentModule - Module containing agentCard, handler, and optional routingKeywords
   */
  register(agentModule) {
    const { agentCard, handler, routingKeywords } = agentModule;

    if (!agentCard || !agentCard.id) {
      throw new Error('Agent must have a valid agentCard with an id');
    }

    if (typeof handler !== 'function') {
      throw new Error(`Agent "${agentCard.id}" must have a handler function`);
    }

    if (this.agents.has(agentCard.id)) {
      throw new Error(`Agent "${agentCard.id}" is already registered`);
    }

    this.agents.set(agentCard.id, {
      card: agentCard,
      handler,
      registeredAt: new Date().toISOString(),
      status: 'active'
    });

    // Initialize health check
    this.healthChecks.set(agentCard.id, {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      tasksProcessed: 0,
      tasksFailed: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    });

    // Register routing rules based on keywords
    if (routingKeywords && Array.isArray(routingKeywords)) {
      this.routingRules.push({
        agentId: agentCard.id,
        keywords: routingKeywords.map(k => k.toLowerCase()),
        capabilities: agentCard.capabilities || []
      });
    }

    console.log(`[AgentRegistry] Registered agent: ${agentCard.id} (${agentCard.name})`);
  }

  /**
   * Get an agent by ID
   * @param {string} agentId - Agent ID
   * @returns {object|null} Agent entry or null
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all registered agents (Agent Cards)
   * @returns {Array} Array of agent cards
   */
  listAgents() {
    const agents = [];
    for (const [id, agent] of this.agents) {
      agents.push({
        ...agent.card,
        status: agent.status,
        registeredAt: agent.registeredAt,
        health: this.healthChecks.get(id)
      });
    }
    return agents;
  }

  /**
   * Route a task to the most appropriate agent
   * @param {string} query - The task query/message
   * @param {object} params - Additional parameters
   * @returns {string|null} Agent ID or null
   */
  routeTask(query, params = {}) {
    // If params contain explicit agentId, use it
    if (params.agentId && this.agents.has(params.agentId)) {
      return params.agentId;
    }

    const lowerQuery = query.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const rule of this.routingRules) {
      const agent = this.agents.get(rule.agentId);
      if (!agent || agent.status !== 'active') continue;

      let score = 0;

      // Keyword matching
      for (const keyword of rule.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += keyword.length; // Longer keyword matches get higher scores
        }
      }

      // Capability matching from params
      if (params.capability) {
        const capMatch = rule.capabilities.includes(params.capability);
        if (capMatch) score += 50;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule.agentId;
      }
    }

    // Default to customer support if no specific match
    if (!bestMatch) {
      if (this.agents.has('customer-support-agent')) {
        return 'customer-support-agent';
      }
      // Return first available agent
      for (const [id, agent] of this.agents) {
        if (agent.status === 'active') return id;
      }
    }

    return bestMatch;
  }

  /**
   * Update agent health metrics
   * @param {string} agentId - Agent ID
   * @param {object} update - Health update data
   */
  updateHealth(agentId, update) {
    const health = this.healthChecks.get(agentId);
    if (!health) return;

    if (update.success !== undefined) {
      health.tasksProcessed++;
      if (!update.success) {
        health.tasksFailed++;
      }
    }

    if (update.responseTime !== undefined) {
      health.totalResponseTime += update.responseTime;
      health.avgResponseTime = Math.round(health.totalResponseTime / health.tasksProcessed);
    }

    health.lastCheck = new Date().toISOString();
    health.status = health.tasksFailed / Math.max(health.tasksProcessed, 1) > 0.5
      ? 'degraded'
      : 'healthy';

    this.healthChecks.set(agentId, health);
  }

  /**
   * Get agent health information
   * @param {string} [agentId] - Optional specific agent ID
   * @returns {object} Health information
   */
  getHealth(agentId) {
    if (agentId) {
      return this.healthChecks.get(agentId) || null;
    }

    const allHealth = {};
    for (const [id, health] of this.healthChecks) {
      allHealth[id] = health;
    }
    return allHealth;
  }

  /**
   * Set agent status (active/inactive)
   * @param {string} agentId - Agent ID
   * @param {string} status - New status
   */
  setAgentStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.agents.set(agentId, agent);
    }
  }

  /**
   * Get registry statistics
   * @returns {object} Registry stats
   */
  getStats() {
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const health of this.healthChecks.values()) {
      totalProcessed += health.tasksProcessed;
      totalFailed += health.tasksFailed;
    }

    return {
      total_agents: this.agents.size,
      active_agents: Array.from(this.agents.values()).filter(a => a.status === 'active').length,
      total_tasks_processed: totalProcessed,
      total_tasks_failed: totalFailed,
      success_rate: totalProcessed > 0
        ? parseFloat(((totalProcessed - totalFailed) / totalProcessed * 100).toFixed(2))
        : 100,
      agents: this.listAgents()
    };
  }
}

module.exports = { AgentRegistry };
