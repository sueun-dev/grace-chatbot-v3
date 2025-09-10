import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { messages, systemPrompt } = await request.json();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini-2024-07-18',
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
          ...messages
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
      role: 'assistant' 
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}