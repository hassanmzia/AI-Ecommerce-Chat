'use strict';

const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const agentCard = {
  id: 'sentiment-agent',
  name: 'Sentiment Analysis Agent',
  description: 'Analyzes customer sentiment, detects frustration or urgency, and suggests escalation when needed',
  capabilities: ['sentiment_analysis', 'frustration_detection', 'urgency_detection', 'escalation_recommendation'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Customer message to analyze for sentiment'
      },
      conversation_history: {
        type: 'array',
        description: 'Previous messages in the conversation for context'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: { type: 'string' },
      sentiment: { type: 'object' },
      escalation: { type: 'object' },
      actions_taken: { type: 'array' }
    }
  }
};

const routingKeywords = [
  'sentiment', 'analyze', 'feeling', 'frustrated', 'angry', 'upset',
  'furious', 'disappointed', 'unhappy', 'terrible', 'worst',
  'horrible', 'disgusting', 'unacceptable', 'ridiculous',
  'never again', 'done with', 'fed up', 'sick of',
  'amazing', 'great', 'wonderful', 'excellent', 'love',
  'thank you', 'appreciate', 'fantastic', 'perfect', 'happy',
  'escalate', 'manager', 'supervisor', 'complaint'
];

// Keyword-based sentiment scoring as a fallback
const sentimentKeywords = {
  very_negative: {
    words: ['furious', 'disgusting', 'horrible', 'worst', 'scam', 'fraud', 'sue', 'lawsuit', 'lawyer', 'attorney', 'unacceptable', 'outrageous'],
    score: -1.0
  },
  negative: {
    words: ['angry', 'upset', 'frustrated', 'disappointed', 'terrible', 'awful', 'bad', 'poor', 'hate', 'never', 'broken', 'wrong', 'fail', 'failed', 'problem', 'issue', 'complaint'],
    score: -0.6
  },
  slightly_negative: {
    words: ['confused', 'unclear', 'slow', 'waiting', 'delay', 'annoyed', 'inconvenient', 'difficult', 'complicated'],
    score: -0.3
  },
  neutral: {
    words: ['ok', 'okay', 'fine', 'alright', 'question', 'wondering', 'asking', 'curious', 'information', 'details'],
    score: 0
  },
  slightly_positive: {
    words: ['nice', 'good', 'decent', 'helpful', 'thanks', 'appreciate', 'useful', 'reasonable'],
    score: 0.3
  },
  positive: {
    words: ['great', 'excellent', 'wonderful', 'amazing', 'love', 'perfect', 'fantastic', 'awesome', 'happy', 'pleased', 'satisfied', 'impressed'],
    score: 0.7
  },
  very_positive: {
    words: ['incredible', 'outstanding', 'exceptional', 'phenomenal', 'best ever', 'blown away', 'above and beyond', 'absolutely love'],
    score: 1.0
  }
};

function analyzeWithKeywords(text) {
  const lowerText = text.toLowerCase();
  let totalScore = 0;
  let matchCount = 0;
  const matchedKeywords = [];

  for (const [category, config] of Object.entries(sentimentKeywords)) {
    for (const word of config.words) {
      if (lowerText.includes(word)) {
        totalScore += config.score;
        matchCount++;
        matchedKeywords.push({ word, category, score: config.score });
      }
    }
  }

  const avgScore = matchCount > 0 ? totalScore / matchCount : 0;

  let label;
  if (avgScore <= -0.6) label = 'very_negative';
  else if (avgScore <= -0.3) label = 'negative';
  else if (avgScore < 0) label = 'slightly_negative';
  else if (avgScore === 0) label = 'neutral';
  else if (avgScore <= 0.3) label = 'slightly_positive';
  else if (avgScore <= 0.7) label = 'positive';
  else label = 'very_positive';

  return {
    score: Math.round(avgScore * 100) / 100,
    label,
    confidence: matchCount > 0 ? Math.min(0.5 + (matchCount * 0.1), 0.85) : 0.3,
    matched_keywords: matchedKeywords,
    method: 'keyword_analysis'
  };
}

function determineEscalation(sentiment, query) {
  const lowerQuery = query.toLowerCase();
  const escalationTriggers = ['manager', 'supervisor', 'escalate', 'lawyer', 'attorney', 'sue', 'legal', 'bbb', 'fraud', 'scam'];
  const explicitEscalation = escalationTriggers.some(t => lowerQuery.includes(t));

  const urgencyKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'now', 'right now', 'today'];
  const isUrgent = urgencyKeywords.some(k => lowerQuery.includes(k));

  let shouldEscalate = false;
  let reason = null;
  let priority = 'normal';

  if (explicitEscalation) {
    shouldEscalate = true;
    reason = 'Customer explicitly requested escalation or used legal/complaint language';
    priority = 'high';
  } else if (sentiment.score <= -0.6) {
    shouldEscalate = true;
    reason = 'Very negative sentiment detected - customer appears highly frustrated';
    priority = 'high';
  } else if (sentiment.score <= -0.3 && isUrgent) {
    shouldEscalate = true;
    reason = 'Negative sentiment combined with urgency indicators';
    priority = 'medium';
  }

  if (isUrgent && priority === 'normal') {
    priority = 'medium';
  }

  return {
    should_escalate: shouldEscalate,
    reason,
    priority,
    is_urgent: isUrgent,
    explicit_escalation_request: explicitEscalation
  };
}

async function handler(input, context) {
  const { query, conversation_history } = input;
  const actionsTaken = [];
  let sentiment = null;
  let aiAnalysis = null;

  // Step 1: Try AI-powered sentiment analysis
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL
    });

    const conversationContext = conversation_history && conversation_history.length > 0
      ? `\nPrevious messages:\n${conversation_history.slice(-5).map(m => `- ${m.role}: ${m.content}`).join('\n')}`
      : '';

    const systemPrompt = `You are a sentiment analysis specialist. Analyze the customer's message and respond ONLY with a JSON object containing:
{
  "score": <number from -1.0 (very negative) to 1.0 (very positive)>,
  "label": <"very_negative"|"negative"|"slightly_negative"|"neutral"|"slightly_positive"|"positive"|"very_positive">,
  "confidence": <number from 0 to 1>,
  "emotions": [<list of detected emotions like "frustrated", "happy", "confused", etc>],
  "key_phrases": [<phrases that indicate sentiment>],
  "summary": "<brief one-sentence summary of the customer's emotional state>"
}

Consider context, sarcasm, and tone. Be accurate and nuanced.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this customer message:${conversationContext}\n\nCurrent message: "${query}"` }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiAnalysis = JSON.parse(jsonMatch[0]);
      sentiment = {
        score: aiAnalysis.score,
        label: aiAnalysis.label,
        confidence: aiAnalysis.confidence,
        emotions: aiAnalysis.emotions || [],
        key_phrases: aiAnalysis.key_phrases || [],
        summary: aiAnalysis.summary || '',
        method: 'ai_analysis'
      };
      actionsTaken.push({ tool: 'openai', status: 'success', summary: 'AI sentiment analysis completed' });
    } else {
      throw new Error('Failed to parse AI sentiment response');
    }
  } catch (error) {
    console.error('[SentimentAgent] OpenAI analysis failed:', error.message);
    actionsTaken.push({ tool: 'openai', status: 'failed', summary: error.message });
  }

  // Step 2: Fallback to keyword analysis if AI fails
  if (!sentiment) {
    sentiment = analyzeWithKeywords(query);
    actionsTaken.push({
      tool: 'keyword_analysis',
      status: 'success',
      summary: `Keyword-based analysis: ${sentiment.label} (score: ${sentiment.score})`
    });
  }

  // Step 3: Determine escalation needs
  const escalation = determineEscalation(sentiment, query);
  actionsTaken.push({
    tool: 'escalation_check',
    status: 'success',
    summary: escalation.should_escalate
      ? `Escalation recommended: ${escalation.reason}`
      : 'No escalation needed'
  });

  // Step 4: Generate response summary
  let responseText = '';
  if (escalation.should_escalate) {
    responseText = `Sentiment Analysis Complete.\n\nSentiment: ${sentiment.label} (Score: ${sentiment.score}, Confidence: ${Math.round(sentiment.confidence * 100)}%)\n\n**ESCALATION RECOMMENDED**: ${escalation.reason}\nPriority: ${escalation.priority.toUpperCase()}${sentiment.summary ? `\n\nSummary: ${sentiment.summary}` : ''}`;
  } else {
    responseText = `Sentiment Analysis Complete.\n\nSentiment: ${sentiment.label} (Score: ${sentiment.score}, Confidence: ${Math.round(sentiment.confidence * 100)}%)${sentiment.emotions && sentiment.emotions.length > 0 ? `\nDetected emotions: ${sentiment.emotions.join(', ')}` : ''}${sentiment.summary ? `\n\nSummary: ${sentiment.summary}` : ''}`;
  }

  return {
    response: responseText,
    sentiment: {
      score: sentiment.score,
      label: sentiment.label,
      confidence: sentiment.confidence,
      emotions: sentiment.emotions || [],
      key_phrases: sentiment.key_phrases || [],
      summary: sentiment.summary || '',
      method: sentiment.method
    },
    escalation,
    actions_taken: actionsTaken,
    agent: agentCard.id,
    timestamp: new Date().toISOString()
  };
}

module.exports = { agentCard, handler, routingKeywords };
