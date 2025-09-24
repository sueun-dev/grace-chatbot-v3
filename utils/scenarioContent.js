// Scenario Messages for Learning Components - Risk Level Based
export const scenarioMessages = {
  // Low Risk (0-3 points) - Basic Alcohol Education
  scenario1: {
    message1: {
      title: "What You'll Learn Today:",
      intro: "You're making responsible choices about alcohol! Let's go over some basic information to help you stay informed.",
      learningPoints: [
        "What is a Standard Drink?",
        "How Alcohol Affects the Body",
        "Alcohol Myths vs. Facts"
      ],
      sections: [
        {
          title: "What is a Standard Drink?",
          content: "A standard drink contains 0.6 ounces (14g) of pure alcohol:",
          list: [
            {
              label: "Beer (5% alcohol)",
              value: "12 oz",
              emphasis: "1 can"
            },
            {
              label: "Wine (12% alcohol)",
              value: "5 oz",
              emphasis: "1 glass"
            },
            {
              label: "Liquor (40% alcohol, e.g., whiskey, vodka)",
              value: "1.5 oz",
              emphasis: "1 shot"
            }
          ]
        }
      ],
      tip: "💡 Tip: Just because a drink is smaller or lighter doesn't mean it contains less alcohol! Cocktails and mixed drinks often have more than one standard drink in them."
    },
    message2: {
      title: "How Alcohol Affects Your Body",
      intro: "You're making responsible choices about alcohol! But did you know that even occasional drinking can affect your body in different ways?",
      sections: [
        {
          title: "Alcohol affects different parts of your body, including:",
          list: [
            "🧠 Brain – Slows down processing speed and decision-making",
            "🫀 Liver – Can cause damage over time with excessive use",
            "😴 Sleep – Can interfere with deep sleep cycles"
          ],
          listType: "disc"
        }
      ],
      didYouKnow: "Did You Know? Even small amounts of alcohol can impair judgment and coordination, making activities like driving dangerous."
    },
    message3: {
      title: "Myths vs. Facts",
      sections: [
        {
          content: "Let's clear up some common misconceptions:",
          myths: [
            {
              myth: "Drinking coffee will sober you up.",
              fact: "Only time helps your body process alcohol. Coffee won't make you sober—just more awake."
            },
            {
              myth: "If I don't feel drunk, I'm okay to drive.",
              fact: "Alcohol can impair judgment before you feel drunk."
            }
          ]
        }
      ]
    }
  },

  // Moderate Risk (4-7 points) - Controlled Drinking & Peer Pressure Management
  scenario2: {
    message1: {
      title: "What You'll Learn Today:",
      intro: "You might benefit from learning ways to manage drinking and social influences.",
      learningPoints: [
        "Setting Drinking Limits",
        "How to Say No to Alcohol",
        "Alternatives to Drinking at Social Events"
      ],
      sections: [
        {
          title: "Setting Drinking Limits",
          content: "Here's how you can stay in control:",
          list: [
            "📝 Set a drink limit before going out",
            "💧 Alternate between alcoholic and non-alcoholic drinks",
            "⏱️ Drink slowly—sip, don't chug!",
            "🎮 Avoid drinking games that encourage excessive drinking"
          ],
          listType: "disc"
        }
      ]
    },
    message2: {
      title: "How to Say No to Alcohol (Without Feeling Awkward)",
      sections: [
        {
          title: "If Someone Offers You a Drink:",
          list: [
            '"No thanks, I\'m good with this one."',
            '"I have an early morning, so I\'m skipping tonight."',
            '"I\'m taking a break from drinking right now."'
          ],
          listType: "disc"
        }
      ],
      tip: "💡 Tip: Keep a non-alcoholic drink in your hand—it helps avoid repeated offers."
    },
    message3: {
      title: "Alternatives to Drinking",
      sections: [
        {
          content: "Not drinking? You can still have fun!",
          list: [
            "✅ Try a mocktail instead of alcohol",
            "✅ Be the designated driver for the night",
            "✅ Get involved in games, dancing, or socializing"
          ],
          listType: "disc"
        }
      ]
    }
  },

  // High Risk (8-12 points) - Harm Reduction & Stress Management
  scenario3: {
    message1: {
      title: "What You'll Learn Today:",
      intro: "Your drinking habits may be affecting your well-being. Let's explore ways to reduce risks and find healthier coping strategies.",
      learningPoints: [
        "How to Recognize Problematic Drinking Patterns",
        "Stress Management Techniques (Without Alcohol)",
        "How to Reduce Drinking Safely"
      ],
      sections: [
        {
          title: "Recognizing Problematic Drinking",
          content: "Signs that drinking is becoming a problem:",
          list: [
            "❌ Drinking more than you planned",
            "❌ Feeling guilty about drinking",
            "❌ Drinking to cope with stress or emotions",
            "❌ Blacking out or forgetting events while drinking"
          ],
          listType: "disc"
        }
      ],
      tip: "💡 Tip: If you notice these signs, it might be time to take a step back and reevaluate your drinking habits."
    },
    message2: {
      title: "Stress Management Without Alcohol",
      sections: [
        {
          content: "Instead of drinking when stressed, try these:",
          list: [
            "🏃 Exercise – Running, yoga, or gym workouts",
            "🧘 Mindfulness – Meditation or deep breathing",
            "🎨 Hobbies – Painting, gaming, or reading",
            "💬 Talking – Reaching out to a friend or therapist"
          ],
          listType: "disc"
        }
      ]
    },
    message3: {
      title: "Practical Tips for Cutting Back on Alcohol",
      intro: "Here are some proven strategies to help you reduce drinking safely:",
      sections: [
        {
          list: [
            "📊 Set a Drink Limit: Before you start drinking, decide how many drinks you'll have—and stick to it",
            "💧 Alternate with Water: Have a glass of water or soda between alcoholic drinks",
            "🎮 Avoid Drinking Games: They make it easy to lose track of how much you're drinking",
            "🍔 Eat Before & During Drinking: Food slows down alcohol absorption",
            "⏱️ Drink Slowly: Take sips, not gulps—your body needs time to process alcohol"
          ],
          listType: "disc"
        }
      ]
    }
  },

  // Severe Risk (13+ points) - Seeking Support & Making a Change
  scenario4: {
    message1: {
      title: "What You'll Learn Today:",
      intro: "It seems like alcohol may be significantly affecting your life. You're not alone, and support is available.",
      learningPoints: [
        "Understanding Alcohol Dependence",
        "How to Cut Back Safely",
        "Where to Get Professional Help"
      ],
      sections: [
        {
          title: "Understanding Alcohol Dependence",
          content: "Signs of alcohol dependence:",
          list: [
            "🚨 Drinking even when it causes problems",
            "🚨 Feeling the need to drink",
            "🚨 Experiencing withdrawal symptoms (shakiness, anxiety)"
          ],
          listType: "disc"
        }
      ],
      fact: "Fact: If you find it hard to stop drinking once you start, seeking support can help."
    },
    message2: {
      title: "How to Cut Back Safely",
      sections: [
        {
          content: "Important steps for reducing alcohol consumption:",
          list: [
            "📉 Gradually reduce drinking instead of stopping suddenly",
            "📋 Set a plan (e.g., no more than 2 drinks per occasion)",
            "👥 Find a support system (friends, family, therapist)"
          ],
          listType: "disc"
        }
      ]
    },
    message3: {
      title: "Where to Get Help",
      sections: [
        {
          content: "Professional support options:",
          list: [
            "📞 Helplines & Support Groups",
            "🏥 Counseling & Treatment Programs",
            "📚 Self-Help Guides"
          ],
          listType: "disc"
        }
      ],
      encouragement: "Remember: Asking for help is a sign of strength, not weakness."
    }
  }
};

// Scenario Questions for Each Risk Level
export const scenarioQuestions = {
  // Low Risk Questions
  scenario1: {
    question1: {
      question: "What do you think counts as a 'standard drink'?",
      options: [
        { text: "A full glass of wine, a bottle of beer, or a shot of liquor", value: "correct" },
        { text: "Any amount of alcohol in a cup", value: "incorrect1" },
        { text: "A cocktail with multiple types of alcohol", value: "incorrect2" }
      ],
      correctAnswer: "correct",
      correctFeedback: "✅ Yes! A standard drink is: 12 oz beer (5% alcohol), 5 oz wine (12% alcohol), or 1.5 oz liquor (40% alcohol).",
      incorrectFeedback: "❌ Not quite! The amount of liquid isn't what matters—it's the alcohol content inside the drink. A cocktail can actually have multiple standard drinks in one glass!"
    },
    question2: {
      question: "What do you think is the most common effect of alcohol on the brain?",
      options: [
        { text: "Slower reaction time", value: "correct" },
        { text: "Increased focus", value: "incorrect1" },
        { text: "Stronger memory", value: "incorrect2" }
      ],
      correctAnswer: "correct",
      correctFeedback: "✅ Correct! Alcohol slows down your brain, making reaction times slower. This is why even small amounts of alcohol can impair driving ability.",
      incorrectFeedback: "❌ Actually, alcohol does the opposite. It slows brain function, which is why people might feel 'foggy' after drinking."
    },
    question3: {
      question: "If I don't feel drunk, am I okay to drive?",
      options: [
        { text: "Yes, if I feel fine, I'm good to drive", value: "incorrect" },
        { text: "No, alcohol can affect me before I feel drunk", value: "correct" }
      ],
      correctAnswer: "correct",
      correctFeedback: "✅ Exactly! Alcohol impairs judgment and reaction time before you actually 'feel' drunk.",
      incorrectFeedback: "❌ Be careful! You may not feel drunk, but even small amounts of alcohol slow down your reaction time and thinking."
    }
  },

  // Moderate Risk Questions
  scenario2: {
    question1: {
      question: "How long does it take for your body to process ONE standard drink?",
      options: [
        { text: "15 minutes", value: "incorrect1" },
        { text: "1 hour", value: "correct" },
        { text: "3 hours", value: "incorrect2" }
      ],
      correctAnswer: "correct",
      correctFeedback: "✅ Yes! On average, your liver processes about one standard drink per hour. Drinking faster than this means your body can't keep up, leading to intoxication.",
      incorrectFeedback: "❌ Actually, it takes about one hour per drink. If you drink multiple drinks in a short period, the alcohol stays in your system longer."
    },
    question2: {
      question: "You're at a party, and a friend offers you a drink. You don't want to drink tonight—how do you respond?",
      options: [
        { text: "No thanks, I'm good with this one", value: "good" },
        { text: "I have an early morning, so I'm skipping tonight", value: "good" },
        { text: "I'm taking a break from drinking right now", value: "good" },
        { text: "Uhh… I don't know, I guess I'll take it", value: "needs_work" }
      ],
      correctFeedback: "✅ Great choice! Keeping it simple and confident works best. Most people respect a direct but friendly response.",
      needsWorkFeedback: "❌ It can be hard to say no, but remember—you always have the choice. Want to see some strategies for handling these situations?"
    },
    question3: {
      question: "Let's say you're at a party, and you don't feel like drinking. What's a fun alternative?",
      options: [
        { text: "Try a mocktail instead of alcohol", value: "good" },
        { text: "Be the designated driver for the night", value: "good" },
        { text: "Get involved in games, dancing, or socializing", value: "good" },
        { text: "Stand awkwardly in the corner and pretend to text", value: "needs_work" }
      ],
      correctFeedback: "✅ Exactly! There are plenty of ways to enjoy yourself without drinking.",
      needsWorkFeedback: "❌ That doesn't sound like much fun! There are better ways to enjoy the party. Want to see some easy conversation starters?"
    }
  },

  // High Risk Questions
  scenario3: {
    question1: {
      question: "Have you ever felt guilty about drinking?",
      options: [
        { text: "Yes, sometimes I regret drinking", value: "yes" },
        { text: "No, I don't feel bad about it", value: "no" }
      ],
      yesFeedback: "That feeling of guilt can be a sign that drinking is affecting you in ways you don't want it to. Want some tips on cutting back?",
      noFeedback: "That's good! Just remember—if drinking ever starts to make you feel bad emotionally, it's okay to take a step back and reflect."
    },
    question2: {
      question: "Which of these is a good alternative to drinking when stressed?",
      options: [
        { text: "Running or yoga", value: "good" },
        { text: "Painting or playing video games", value: "good" },
        { text: "Calling a friend", value: "good" },
        { text: "All of the above", value: "best" }
      ],
      correctFeedback: "✅ That's right! There are so many ways to manage stress without alcohol. Finding what works best for you is key."
    },
    question3: {
      question: "Which of these tips do you think would work best for you?",
      options: [
        { text: "Setting a drink limit", value: "good" },
        { text: "Alternating drinks with water", value: "good" },
        { text: "Avoiding drinking games", value: "good" },
        { text: "Drinking more slowly", value: "good" }
      ],
      feedback: "✅ Great choice! Even one small change can help you drink less without feeling like you're missing out."
    }
  },

  // Severe Risk Questions
  scenario4: {
    question1: {
      question: "If drinking started causing problems in your work, school, or relationships, what would you do?",
      options: [
        { text: "Try to cut back on my own", value: "okay" },
        { text: "Talk to someone I trust", value: "good" },
        { text: "Ignore it and hope it improves", value: "needs_help" }
      ],
      okayFeedback: "That's a good step! Cutting back can help, but having a plan or support system can make it easier. Want some tips?",
      goodFeedback: "✅ Talking to someone is a great idea! Support from friends, family, or a professional can make a big difference.",
      needsHelpFeedback: "❌ Ignoring it might seem easier, but problems tend to grow over time. Want to see some simple ways to manage drinking?"
    },
    question2: {
      question: "What's a good strategy to help limit alcohol consumption?",
      options: [
        { text: "Set a drink limit before going out", value: "good" },
        { text: "Space out drinks with water or food", value: "good" },
        { text: "Find supportive friends or family to check in with", value: "good" },
        { text: "All of the above", value: "best" }
      ],
      correctFeedback: "✅ That's right! Setting limits, drinking water, and having a support system all help you drink less.",
      incorrectFeedback: "❌ Actually, combining multiple strategies—setting a limit, spacing out drinks, and seeking support—is the best way to cut back safely."
    },
    question3: {
      question: "If you needed help with drinking, where would you feel most comfortable starting?",
      options: [
        { text: "Talking to a trusted friend or family member", value: "good" },
        { text: "Looking up online resources or self-help guides", value: "good" },
        { text: "Reaching out to a counselor or support group", value: "good" },
        { text: "I'm not sure—I haven't thought about it", value: "uncertain" }
      ],
      goodFeedback: "✅ That's a great step! Whether it's a trusted person, online research, or professional help, taking action is what matters.",
      uncertainFeedback: "✅ That's okay! If you ever want to explore options, I can share resources with you."
    }
  }
};