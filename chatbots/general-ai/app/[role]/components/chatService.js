// Chat service to simulate AI responses
export const generateTimestamp = () => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const simulateAIResponse = async (userMessage, conversationHistory) => {
  // Simulate API delay
  await new Promise((resolve) =>
    setTimeout(resolve, 1500 + Math.random() * 1000)
  );

  // Check if the last message was a multiple choice question
  const lastMessage = conversationHistory[conversationHistory.length - 1];
  const isAnswerToMultipleChoice =
    lastMessage && lastMessage.type === "multiple-choice";

  if (isAnswerToMultipleChoice) {
    // Return success message for multiple choice answers
    return {
      type: "success",
      content:
        "That's right! One hour per drink. Drinking faster than that can cause alcohol to build up in your bloodstream.",
      timestamp: generateTimestamp(),
    };
  }

  const responses = [
    {
      type: "options",
      content:
        "Did you know? 🚨 'Drinking before age 21 can affect brain development.' Want to know how?",
      options: ["Tell me more", "Skip this"],
      timestamp: generateTimestamp(),
    },
    {
      type: "multiple-choice",
      content:
        "Let's test your knowledge. How long does it take the liver to process one standard drink?",
      options: ["1 hour", "15 minutes", "30 minutes"],
      correctAnswer: "1 hour",
      timestamp: generateTimestamp(),
    },
    {
      type: "options",
      content: "Want to try another question?",
      options: ["Yes", "No"],
      timestamp: generateTimestamp(),
    },
    {
      type: "text",
      content:
        "Great! Here's another important fact: Binge drinking (5+ drinks for men, 4+ for women in 2 hours) can lead to serious health risks.",
      timestamp: generateTimestamp(),
    },
    {
      type: "multiple-choice",
      content: "What's the safest way to drink alcohol?",
      options: [
        "Drink on an empty stomach",
        "Alternate with water",
        "Drink quickly to get it over with",
      ],
      correctAnswer: "Alternate with water",
      timestamp: generateTimestamp(),
    },
    {
      type: "success",
      content:
        "Excellent! Alternating with water helps you stay hydrated and slows down your drinking pace.",
      timestamp: generateTimestamp(),
    },
    {
      type: "text",
      content:
        "Remember, the key is moderation and making informed choices. Is there anything specific about alcohol safety you'd like to learn more about?",
      timestamp: generateTimestamp(),
    },
  ];

  // Simple logic to cycle through responses based on conversation length
  const responseIndex = conversationHistory.length % responses.length;
  return responses[responseIndex];
};

export const getInitialMessages = () => {
  return [
    {
      id: 1,
      type: "text",
      content:
        "👋 Hi there! I'm here to help you make smarter choices when it comes to alcohol. Ready to get started?",
      timestamp: generateTimestamp(),
      isUser: false,
    },
  ];
};
