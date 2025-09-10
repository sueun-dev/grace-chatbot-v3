import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userResponse, scenario, context } = await request.json();
    
    // Evaluation prompt to determine if response is appropriate
    const evaluationPrompt = `
You are evaluating a user's response in a medical training scenario.

Scenario: ${scenario}
Context: ${context || 'Medical professional training'}
User Response: "${userResponse}"

Evaluate if this response is appropriate for a medical professional. Consider:
1. Professionalism and empathy
2. Medical accuracy (if applicable)
3. Communication clarity
4. Ethical considerations
5. Patient safety

Respond with ONLY a JSON object in this exact format:
{
  "isAppropriate": true/false,
  "reason": "Brief explanation",
  "suggestions": ["suggestion1", "suggestion2"],
  "score": 0-100
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini-2024-07-18',
        messages: [
          { role: 'system', content: 'You are a medical training evaluator. Always respond with valid JSON only.' },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const evaluationText = data.choices[0].message.content;
    
    // Parse the JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      evaluation = {
        isAppropriate: false,
        reason: 'Unable to evaluate response',
        suggestions: ['Please try rephrasing your response'],
        score: 50
      };
    }
    
    return NextResponse.json(evaluation);
    
  } catch (error) {
    console.error('Evaluation API error:', error);
    return NextResponse.json(
      { 
        isAppropriate: false,
        reason: 'Evaluation failed',
        suggestions: [],
        score: 0
      },
      { status: 500 }
    );
  }
}