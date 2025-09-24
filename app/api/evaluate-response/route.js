import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userResponse, scenario, context } = await request.json();
    
    // Evaluation prompt to determine if response is appropriate
    const evaluationPrompt = `
You are evaluating a user's response in an alcohol awareness training scenario.

Scenario: ${scenario}
Context: ${context || 'Alcohol awareness training'}
User Response: "${userResponse}"

Evaluate if the response demonstrates understanding and appropriate handling of the alcohol-related scenario.

Mark as APPROPRIATE (score 70-100) if the response:
- Directly addresses the scenario situation
- Shows clear refusal or boundary-setting relevant to the scenario
- Demonstrates understanding of the risks involved
- Provides a reasonable strategy for handling the situation
- Shows responsible decision-making

Examples of GOOD responses:
- "No thanks, I'm the designated driver tonight"
- "I've had enough, I need to stop now"
- "I don't feel comfortable with that, let's do something else"
- "My friend needs help, let me call them a ride"

Mark as PARTIALLY APPROPRIATE (score 40-69) if the response:
- Shows some awareness but lacks clarity
- Is too brief (just "no" without context)
- Shows intent but poor execution

Mark as INAPPROPRIATE (score 0-39) if the response:
- Is completely unrelated to the scenario
- Encourages risky behavior
- Shows no understanding of the situation
- Is just random text or very short meaningless phrases
- Agrees to dangerous behavior

Be FAIR but EXPECT RELEVANCE. The response should demonstrate they understood the scenario.

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
          { role: 'system', content: 'You are an alcohol awareness training evaluator. Apply fair but meaningful standards - responses should demonstrate understanding of the scenario and show responsible decision-making. Score 70+ for clear appropriate responses, 40-69 for partial understanding, below 40 for inappropriate. Always respond with valid JSON only.' },
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