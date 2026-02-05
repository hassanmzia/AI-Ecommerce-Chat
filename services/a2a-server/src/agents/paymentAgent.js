'use strict';

const axios = require('axios');
const OpenAI = require('openai');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://mcp-server:3068';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const agentCard = {
  id: 'payment-agent',
  name: 'Payment Agent',
  description: 'Handles payment inquiries with privacy protection, billing questions, and refund status',
  capabilities: ['payment_info', 'billing_inquiry', 'refund_status', 'payment_methods'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Payment-related query or question'
      },
      order_id: {
        type: 'string',
        description: 'Order ID to look up payment for'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: { type: 'string' },
      payment_data: { type: 'object' },
      actions_taken: { type: 'array' },
      privacy_notice: { type: 'string' }
    }
  }
};

const routingKeywords = [
  'payment', 'pay', 'paid', 'billing', 'bill', 'invoice',
  'charge', 'charged', 'credit card', 'debit card', 'card',
  'refund', 'money back', 'reimbursement', 'transaction',
  'receipt', 'payment method', 'payment status', 'payment failed',
  'double charged', 'overcharged', 'pending charge', 'bank',
  'wallet', 'paypal', 'stripe', 'payment confirmation'
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
    console.error(`[PaymentAgent] MCP tool "${toolName}" failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function handler(input, context) {
  const { query, order_id } = input;
  const actionsTaken = [];
  let paymentData = null;

  // Step 1: Look up payment info if order_id provided
  if (order_id) {
    const paymentResult = await invokeMCPTool('payment_info', { order_id });
    if (paymentResult.success && paymentResult.data) {
      paymentData = paymentResult.data;
      actionsTaken.push({
        tool: 'payment_info',
        status: 'success',
        summary: `Retrieved payment info for order ${order_id} - Status: ${paymentData.payment_status}`
      });
    } else {
      actionsTaken.push({
        tool: 'payment_info',
        status: 'failed',
        summary: paymentResult.error || 'Payment info not found'
      });
    }
  }

  // Step 2: Generate response with OpenAI
  let aiResponse = '';
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL
    });

    let paymentContext = '';
    if (paymentData) {
      paymentContext = `
Payment Details:
- Order ID: ${paymentData.order_id}
- Payment Status: ${paymentData.payment_status}
- Payment Method: ${paymentData.payment_method}
- Card: ${paymentData.masked_card || 'N/A'}
- Card Brand: ${paymentData.card_brand || 'N/A'}
- Amount: $${paymentData.amount} ${paymentData.currency}
- Transaction ID: ${paymentData.transaction_id || 'N/A'}
- Paid At: ${paymentData.paid_at || 'N/A'}
- Refundable: ${paymentData.refundable ? 'Yes' : 'No'}`;
    }

    const systemPrompt = `You are a payment specialist for an e-commerce platform.
Handle payment inquiries with strict privacy and security awareness.
CRITICAL RULES:
- NEVER reveal full card numbers, CVV, or sensitive payment details
- Only show masked/partial information (e.g., ****-****-****-1234)
- Be clear about payment statuses and what they mean
- For refund requests, explain the process and timeline
- If a payment issue is detected, offer clear next steps
- Maintain a reassuring and professional tone
- Remind customers that sensitive information is protected`;

    const userMessage = paymentData
      ? `Customer Query: ${query}\n\n${paymentContext}`
      : `Customer Query: ${query}\n\nNo payment data available. ${order_id ? `Order "${order_id}" payment info could not be retrieved.` : 'No order ID provided.'}`;

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
    actionsTaken.push({ tool: 'openai', status: 'success', summary: 'Generated payment response' });
  } catch (error) {
    console.error('[PaymentAgent] OpenAI error:', error.message);

    if (paymentData) {
      const statusDescriptions = {
        pending: 'Your payment is being processed.',
        completed: 'Your payment has been successfully processed.',
        paid: 'Your payment has been received.',
        failed: 'There was an issue with your payment. Please try again or use a different payment method.',
        refunded: 'Your payment has been refunded.',
        cancelled: 'The payment was cancelled.'
      };
      const statusDesc = statusDescriptions[paymentData.payment_status] || `Payment status: ${paymentData.payment_status}`;
      aiResponse = `Payment Information for Order ${paymentData.order_id}:\n\n${statusDesc}\n\nPayment Method: ${paymentData.payment_method}${paymentData.masked_card ? `\nCard: ${paymentData.masked_card}` : ''}\nAmount: $${paymentData.amount} ${paymentData.currency}${paymentData.refundable ? '\n\nThis payment is eligible for a refund if needed.' : ''}`;
    } else {
      aiResponse = order_id
        ? `I wasn't able to find payment information for order "${order_id}". Please verify the order ID. If you're experiencing a payment issue, please contact our support team.`
        : `I'd be happy to help with your payment inquiry. Could you please provide your order ID so I can look up the payment details?`;
    }
    actionsTaken.push({ tool: 'openai', status: 'fallback', summary: 'Used template response' });
  }

  return {
    response: aiResponse,
    payment_data: paymentData ? {
      order_id: paymentData.order_id,
      payment_status: paymentData.payment_status,
      payment_method: paymentData.payment_method,
      masked_card: paymentData.masked_card,
      amount: paymentData.amount,
      currency: paymentData.currency,
      refundable: paymentData.refundable
    } : null,
    actions_taken: actionsTaken,
    privacy_notice: 'Payment information is displayed in masked format for security. Full card details are never stored or displayed.',
    agent: agentCard.id,
    timestamp: new Date().toISOString()
  };
}

module.exports = { agentCard, handler, routingKeywords };
