'use strict';

const axios = require('axios');
const OpenAI = require('openai');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://mcp-server:3068';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const agentCard = {
  id: 'order-agent',
  name: 'Order Management Agent',
  description: 'Handles order tracking, status updates, and order-related inquiries',
  capabilities: ['order_tracking', 'order_status', 'order_history', 'order_cancellation'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Order-related query or question'
      },
      order_id: {
        type: 'string',
        description: 'Order ID for direct lookup'
      },
      customer_id: {
        type: 'string',
        description: 'Customer ID for order history'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: { type: 'string' },
      order_data: { type: 'object' },
      actions_taken: { type: 'array' }
    }
  }
};

const routingKeywords = [
  'order', 'track', 'tracking', 'shipment', 'shipping', 'delivery',
  'deliver', 'shipped', 'transit', 'package', 'parcel',
  'order status', 'where is my', 'when will', 'estimated delivery',
  'cancel order', 'cancellation', 'order history', 'my orders',
  'order number', 'tracking number', 'order details', 'order summary'
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
    console.error(`[OrderAgent] MCP tool "${toolName}" failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function handler(input, context) {
  const { query, order_id, customer_id } = input;
  const actionsTaken = [];
  let orderData = null;

  // Step 1: Look up specific order if order_id provided
  if (order_id) {
    const trackResult = await invokeMCPTool('order_tracking', { order_id });
    if (trackResult.success && trackResult.data) {
      orderData = trackResult.data;
      actionsTaken.push({
        tool: 'order_tracking',
        status: 'success',
        summary: `Retrieved order ${order_id} - Status: ${orderData.status}`
      });
    } else {
      actionsTaken.push({
        tool: 'order_tracking',
        status: 'failed',
        summary: trackResult.error || 'Order not found'
      });
    }
  }

  // Step 2: If customer_id provided but no order_id, try to find recent orders
  if (!order_id && customer_id && context.db) {
    try {
      const recentOrders = await context.db.query(
        `SELECT id, status, total_amount, created_at
         FROM orders
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [customer_id]
      );

      if (recentOrders.rows.length > 0) {
        // Get tracking for the most recent order
        const latestOrderId = recentOrders.rows[0].id;
        const trackResult = await invokeMCPTool('order_tracking', { order_id: latestOrderId });
        if (trackResult.success && trackResult.data) {
          orderData = trackResult.data;
          orderData.recent_orders = recentOrders.rows.map(o => ({
            order_id: o.id,
            status: o.status,
            total: parseFloat(o.total_amount),
            date: o.created_at
          }));
          actionsTaken.push({
            tool: 'order_tracking',
            status: 'success',
            summary: `Found ${recentOrders.rows.length} orders. Showing latest: ${latestOrderId}`
          });
        }
      } else {
        actionsTaken.push({
          tool: 'database_query',
          status: 'success',
          summary: 'No orders found for this customer'
        });
      }
    } catch (err) {
      console.error('[OrderAgent] Database query failed:', err.message);
      actionsTaken.push({
        tool: 'database_query',
        status: 'failed',
        summary: err.message
      });
    }
  }

  // Step 3: Generate response with OpenAI
  let aiResponse = '';
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL
    });

    let orderContext = '';
    if (orderData) {
      orderContext = `
Order Details:
- Order ID: ${orderData.order_id}
- Status: ${orderData.status}
- Items: ${orderData.item_count} item(s)
- Total: $${orderData.total_amount}
- Tracking Number: ${orderData.tracking_number}
- Estimated Delivery: ${orderData.estimated_delivery}
- Created: ${orderData.created_at}`;

      if (orderData.items && orderData.items.length > 0) {
        orderContext += '\n- Products: ' + orderData.items.map(i =>
          `${i.product_name} (x${i.quantity})`
        ).join(', ');
      }

      if (orderData.recent_orders) {
        orderContext += '\n\nRecent Order History:\n' + orderData.recent_orders.map(o =>
          `- ${o.order_id}: ${o.status} - $${o.total} (${new Date(o.date).toLocaleDateString()})`
        ).join('\n');
      }
    }

    const systemPrompt = `You are a helpful order management specialist for an e-commerce platform.
Provide clear, accurate information about order status and tracking.
Be empathetic if there are delays or issues.
Explain order statuses in customer-friendly language.
If an order cannot be found, ask for the correct order ID.
For cancellation requests, explain the process and any limitations.`;

    const userMessage = orderData
      ? `Customer Query: ${query}\n\n${orderContext}`
      : `Customer Query: ${query}\n\nNo order data available. ${order_id ? `Order ID "${order_id}" was not found.` : 'No order ID was provided.'}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    aiResponse = completion.choices[0]?.message?.content || '';
    actionsTaken.push({ tool: 'openai', status: 'success', summary: 'Generated order response' });
  } catch (error) {
    console.error('[OrderAgent] OpenAI error:', error.message);

    if (orderData) {
      const statusMessages = {
        pending: 'Your order has been received and is being processed.',
        confirmed: 'Your order has been confirmed and is being prepared.',
        processing: 'Your order is currently being prepared for shipment.',
        shipped: 'Your order has been shipped! It\'s on its way to you.',
        in_transit: 'Your package is in transit and on its way.',
        out_for_delivery: 'Great news! Your package is out for delivery today.',
        delivered: 'Your order has been delivered.',
        cancelled: 'This order has been cancelled.'
      };
      const statusMsg = statusMessages[orderData.status] || `Current status: ${orderData.status}`;
      aiResponse = `Here's the update on your order ${orderData.order_id}:\n\n${statusMsg}\n\nTracking Number: ${orderData.tracking_number}\nEstimated Delivery: ${orderData.estimated_delivery}\nTotal: $${orderData.total_amount}`;
    } else {
      aiResponse = order_id
        ? `I wasn't able to find order "${order_id}". Please verify the order ID and try again. You can find your order ID in your confirmation email.`
        : `I'd be happy to help you with your order. Could you please provide your order ID so I can look it up? You can find it in your order confirmation email.`;
    }
    actionsTaken.push({ tool: 'openai', status: 'fallback', summary: 'Used template response' });
  }

  return {
    response: aiResponse,
    order_data: orderData,
    actions_taken: actionsTaken,
    agent: agentCard.id,
    timestamp: new Date().toISOString()
  };
}

module.exports = { agentCard, handler, routingKeywords };
