// Test OpenAI API
const testOpenAIAPI = async () => {
  try {
    console.log('Testing OpenAI API...');
    
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, can you help me?' }
        ],
        systemPrompt: 'You are a helpful assistant.'
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:', data);
    console.log('✅ OpenAI API is working correctly!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test Evaluation API
const testEvaluationAPI = async () => {
  try {
    console.log('\nTesting Evaluation API...');
    
    const response = await fetch('http://localhost:3001/api/evaluate-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userResponse: 'No thanks, I am the designated driver tonight.',
        scenario: 'Someone offers you a drink at a party',
        context: 'Peer pressure situation'
      }),
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Evaluation Response:', data);
    console.log('✅ Evaluation API is working correctly!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run tests
const runTests = async () => {
  console.log('Starting API tests...\n');
  await testOpenAIAPI();
  await testEvaluationAPI();
  console.log('\n✅ All tests completed!');
};

runTests();