'use strict';

const axios = require('axios');
const OpenAI = require('openai');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://mcp-server:3068';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const agentCard = {
  id: 'product-agent',
  name: 'Product Search Agent',
  description: 'Handles product queries, comparisons, and catalog browsing',
  capabilities: ['product_search', 'product_comparison', 'category_browsing'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Product search query or question'
      },
      category: {
        type: 'string',
        description: 'Optional product category filter'
      },
      min_price: {
        type: 'number',
        description: 'Minimum price filter'
      },
      max_price: {
        type: 'number',
        description: 'Maximum price filter'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: { type: 'string' },
      products: { type: 'array' },
      actions_taken: { type: 'array' }
    }
  }
};

const routingKeywords = [
  'product', 'search', 'find', 'looking for', 'buy', 'purchase',
  'catalog', 'browse', 'category', 'compare', 'comparison',
  'price', 'cheap', 'expensive', 'affordable', 'budget',
  'brand', 'model', 'specification', 'specs', 'features',
  'available', 'in stock', 'new arrivals', 'best seller',
  'electronics', 'clothing', 'shoes', 'accessories', 'home',
  'show me', 'what do you have', 'do you sell'
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
    console.error(`[ProductAgent] MCP tool "${toolName}" failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function handler(input, context) {
  const { query, category, min_price, max_price } = input;
  const actionsTaken = [];
  let products = [];

  // Step 1: Search products
  const searchParams = { query, max_results: 10 };
  if (category) searchParams.category = category;
  if (min_price !== undefined) searchParams.min_price = min_price;
  if (max_price !== undefined) searchParams.max_price = max_price;

  const searchResult = await invokeMCPTool('product_search', searchParams);

  if (searchResult.success && searchResult.data) {
    products = searchResult.data.products || [];
    actionsTaken.push({
      tool: 'product_search',
      status: 'success',
      summary: `Found ${searchResult.data.total_count} products, returning ${products.length}`
    });
  } else {
    actionsTaken.push({
      tool: 'product_search',
      status: 'failed',
      summary: searchResult.error || 'Search failed'
    });
  }

  // Step 2: Get recommendations if few results
  if (products.length < 3) {
    const recResult = await invokeMCPTool('get_recommendations', {
      category: category || undefined,
      limit: 5
    });

    if (recResult.success && recResult.data) {
      const recs = recResult.data.recommendations || [];
      // Add recommendations that are not already in products
      const existingIds = new Set(products.map(p => p.product_id));
      const newRecs = recs.filter(r => !existingIds.has(r.product_id));
      products = [...products, ...newRecs];

      actionsTaken.push({
        tool: 'get_recommendations',
        status: 'success',
        summary: `Added ${newRecs.length} recommended products`
      });
    }
  }

  // Step 3: Use OpenAI to generate a natural language response
  let aiResponse = '';
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL
    });

    const productSummary = products.length > 0
      ? products.slice(0, 5).map((p, i) =>
          `${i + 1}. ${p.name} - $${p.price}${p.rating ? ` (Rating: ${p.rating}/5)` : ''} - ${p.in_stock ? 'In Stock' : 'Out of Stock'}`
        ).join('\n')
      : 'No products found matching the criteria.';

    const systemPrompt = `You are a helpful product specialist for an e-commerce store.
Help customers find the right products based on their needs.
Be conversational, helpful, and provide relevant product information.
If showing products, highlight key features and benefits.
If no products match, suggest alternatives or broader search terms.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Customer is looking for: "${query}"\n\nAvailable products:\n${productSummary}\n\nTotal matches: ${products.length}` }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    aiResponse = completion.choices[0]?.message?.content || '';
    actionsTaken.push({ tool: 'openai', status: 'success', summary: 'Generated product response' });
  } catch (error) {
    console.error('[ProductAgent] OpenAI error:', error.message);

    if (products.length > 0) {
      const productList = products.slice(0, 5).map((p, i) =>
        `${i + 1}. **${p.name}** - $${p.price}${p.rating ? ` (${p.rating}/5 stars)` : ''}`
      ).join('\n');
      aiResponse = `Here are the products I found for "${query}":\n\n${productList}\n\nWould you like more details about any of these products?`;
    } else {
      aiResponse = `I couldn't find products matching "${query}". Could you try different search terms or browse our categories?`;
    }
    actionsTaken.push({ tool: 'openai', status: 'fallback', summary: 'Used template response' });
  }

  return {
    response: aiResponse,
    products: products.slice(0, 10),
    total_found: products.length,
    filters_applied: { category, min_price, max_price },
    actions_taken: actionsTaken,
    agent: agentCard.id,
    timestamp: new Date().toISOString()
  };
}

module.exports = { agentCard, handler, routingKeywords };
