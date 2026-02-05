'use strict';

const axios = require('axios');
const OpenAI = require('openai');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://mcp-server:3068';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const agentCard = {
  id: 'recommendation-agent',
  name: 'Recommendation Agent',
  description: 'Provides personalized product recommendations based on user behavior and preferences',
  capabilities: ['personalized_recommendations', 'trending_products', 'similar_products', 'category_suggestions'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Recommendation request or preference description'
      },
      user_id: {
        type: 'string',
        description: 'User ID for personalized recommendations'
      },
      category: {
        type: 'string',
        description: 'Category to focus recommendations on'
      },
      limit: {
        type: 'number',
        description: 'Number of recommendations to return'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: { type: 'string' },
      recommendations: { type: 'array' },
      strategy: { type: 'string' },
      actions_taken: { type: 'array' }
    }
  }
};

const routingKeywords = [
  'recommend', 'recommendation', 'suggest', 'suggestion',
  'similar', 'like this', 'what else', 'also like',
  'trending', 'popular', 'best selling', 'top rated',
  'gift', 'gift idea', 'for him', 'for her', 'for kids',
  'you might like', 'based on', 'personalized', 'curated',
  'what should i', 'what do you suggest', 'help me choose',
  'alternatives', 'instead of', 'similar to'
];

async function invokeMCPTool(toolName, params) {
  try {
    const response = await axios.post(
      `${MCP_SERVER_URL}/mcp/tools/${toolName}/invoke`,
      { params },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    console.error(`[RecommendationAgent] MCP tool "${toolName}" failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function handler(input, context) {
  const { query, user_id, category, limit } = input;
  const actionsTaken = [];
  let recommendations = [];
  let strategy = 'general';

  // Step 1: Get personalized or general recommendations
  const recParams = { limit: limit || 8 };
  if (user_id) recParams.user_id = user_id;
  if (category) recParams.category = category;

  const recResult = await invokeMCPTool('get_recommendations', recParams);

  if (recResult.success && recResult.data) {
    recommendations = recResult.data.recommendations || [];
    strategy = recResult.data.strategy;
    actionsTaken.push({
      tool: 'get_recommendations',
      status: 'success',
      summary: `Got ${recommendations.length} recommendations (strategy: ${strategy})`
    });
  } else {
    actionsTaken.push({
      tool: 'get_recommendations',
      status: 'failed',
      summary: recResult.error || 'Recommendations unavailable'
    });
  }

  // Step 2: Supplement with search if query contains specific product types
  if (recommendations.length < 3 && query) {
    const searchResult = await invokeMCPTool('product_search', {
      query,
      max_results: 5,
      min_rating: 4
    });

    if (searchResult.success && searchResult.data) {
      const searchProducts = searchResult.data.products || [];
      const existingIds = new Set(recommendations.map(r => r.product_id));
      const newProducts = searchProducts
        .filter(p => !existingIds.has(p.product_id))
        .map((p, i) => ({
          rank: recommendations.length + i + 1,
          product_id: p.product_id,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          image_url: p.image_url,
          rating: p.rating,
          in_stock: p.in_stock
        }));

      recommendations = [...recommendations, ...newProducts];
      actionsTaken.push({
        tool: 'product_search',
        status: 'success',
        summary: `Added ${newProducts.length} additional products from search`
      });
    }
  }

  // Step 3: Generate natural language response with OpenAI
  let aiResponse = '';
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL
    });

    const recSummary = recommendations.length > 0
      ? recommendations.slice(0, 6).map((r, i) =>
          `${i + 1}. ${r.name} - $${r.price}${r.rating ? ` (${r.rating}/5 stars)` : ''} - ${r.category || 'General'}${r.in_stock ? '' : ' [Out of Stock]'}`
        ).join('\n')
      : 'No recommendations available at the moment.';

    const systemPrompt = `You are a personalized shopping assistant for an e-commerce platform.
Your role is to recommend products that match the customer's needs and preferences.
Be enthusiastic but honest about product recommendations.
Highlight why each product is a good fit for the customer.
If the recommendations are personalized, mention that.
Group similar items and suggest complementary products.
Keep your response conversational and engaging.`;

    const userMessage = `Customer request: "${query}"
${user_id ? 'This is a returning customer with personalized recommendations.' : 'This is a general recommendation request.'}
${category ? `Preferred category: ${category}` : ''}
Recommendation strategy: ${strategy}

Available recommendations:
${recSummary}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 600,
      temperature: 0.8
    });

    aiResponse = completion.choices[0]?.message?.content || '';
    actionsTaken.push({ tool: 'openai', status: 'success', summary: 'Generated recommendation narrative' });
  } catch (error) {
    console.error('[RecommendationAgent] OpenAI error:', error.message);

    if (recommendations.length > 0) {
      const recList = recommendations.slice(0, 5).map((r, i) =>
        `${i + 1}. **${r.name}** - $${r.price}${r.rating ? ` (${r.rating} stars)` : ''}`
      ).join('\n');
      aiResponse = `Based on your interests, here are my top recommendations:\n\n${recList}\n\nWould you like more details about any of these products?`;
    } else {
      aiResponse = `I'd love to help you find the perfect product! Could you tell me more about what you're looking for? For example, a specific category, price range, or use case?`;
    }
    actionsTaken.push({ tool: 'openai', status: 'fallback', summary: 'Used template response' });
  }

  return {
    response: aiResponse,
    recommendations: recommendations.slice(0, 10),
    total_recommendations: recommendations.length,
    strategy,
    personalized: !!user_id,
    actions_taken: actionsTaken,
    agent: agentCard.id,
    timestamp: new Date().toISOString()
  };
}

module.exports = { agentCard, handler, routingKeywords };
