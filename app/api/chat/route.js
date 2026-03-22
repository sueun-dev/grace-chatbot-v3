import { NextResponse } from 'next/server';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES = 50;

// Server-side system prompts — clients select by key, not by content
const SYSTEM_PROMPTS = {
  default: 'You are a helpful assistant.',
  medical:
    'You are a helpful medical training assistant. You are having a conversation with a medical professional in training. Be professional, informative, and supportive. You can discuss medical topics, provide guidance on patient care, and help reflect on the training scenarios they have completed. Keep responses concise and relevant.',
  student:
    'You are a helpful student training assistant. You are having a conversation with a student in an alcohol awareness training program. Be supportive, educational, and encouraging. Help them understand the scenarios and reflect on responsible decision-making. Keep responses concise and relevant.',
};

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;

  const sanitized = [];
  for (const msg of messages.slice(-MAX_MESSAGES)) {
    // Only allow user and assistant roles — block injected system messages
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;
    if (typeof msg.content !== 'string') continue;

    sanitized.push({
      role: msg.role,
      content: msg.content.slice(0, MAX_MESSAGE_LENGTH),
    });
  }
  return sanitized.length > 0 ? sanitized : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages, promptKey } = body;

    const sanitized = sanitizeMessages(messages);
    if (!sanitized) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array of {role, content} objects' },
        { status: 400 }
      );
    }

    // Select system prompt by key; ignore any client-supplied prompt content
    const systemContent = SYSTEM_PROMPTS[promptKey] || SYSTEM_PROMPTS.default;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini-2024-07-18',
        messages: [
          { role: 'system', content: systemContent },
          ...sanitized,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({
      content: data.choices[0].message.content,
      role: 'assistant',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}
