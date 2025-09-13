// Questionnaire Schema
export const QUESTIONNAIRE_SCHEMA = {
  id: "alcohol-awareness-assessment",
  title: "Alcohol Awareness Assessment",
  description:
    "A comprehensive assessment to understand your relationship with alcohol",
  questions: [
    {
      id: "age_check",
      type: "options",
      content: "Are you between the ages of 21 and 25?",
      options: [
        { id: "yes", text: "Yes", value: "yes" },
        { id: "no", text: "No", value: "no" },
      ],
      nextQuestion: {
        yes: "alcohol_experience",
        no: "age_outside_range",
      },
    },
    {
      id: "age_outside_range",
      type: "options",
      content:
        "This assessment is designed for individuals between 18 and 20 years old. If you're younger or older, I can still provide general information on alcohol awareness. Would you like to continue?",
      options: [
        {
          id: "continue",
          text: "Yes, I'd still like to learn more",
          value: "continue",
        },
        { id: "end", text: "No, I'd rather not", value: "end" },
      ],
      nextQuestion: {
        continue: "alcohol_experience",
        end: "assessment_end",
      },
    },
    {
      id: "alcohol_experience",
      type: "options",
      content: "Have you ever had alcohol before, even just a few sips?",
      options: [
        { id: "yes", text: "Yes", value: "yes" },
        { id: "no", text: "No", value: "no" },
      ],
      nextQuestion: {
        yes: "continue_assessment",
        no: "continue_assessment",
      },
    },
    {
      id: "continue_assessment",
      type: "options",
      content:
        "Thanks for sharing! Even if you don't drink, this assessment can help you learn more about alcohol risks and peer influences. Would you like to continue?",
      options: [
        { id: "yes", text: "Yes, let's do it!", value: "yes" },
        // { id: "no", text: "No, I just want general information", value: "no" },
      ],
      nextQuestion: {
        yes: "drinking_frequency",
        no: "crafft_intro",
      },
    },
    // NIAAA Questions (for drinkers)
    {
      id: "drinking_frequency",
      type: "options",
      content:
        "Great! Let's start with a few questions about your drinking habits. How often do you usually drink?",
      options: [
        { id: "daily", text: "Daily", value: "daily", points: 5 },
        { id: "weekly", text: "Weekly", value: "weekly", points: 4 },
        {
          id: "occasionally",
          text: "Occasionally",
          value: "occasionally",
          points: 3,
        },
        { id: "rarely", text: "Rarely", value: "rarely", points: 2 },
        { id: "never", text: "Never", value: "never", points: 0 },
      ],
      nextQuestion: {
        daily: "binge_drinking",
        weekly: "binge_drinking",
        occasionally: "binge_drinking",
        rarely: "binge_drinking",
        never: "crafft_intro",
      },
    },
    {
      id: "binge_drinking",
      type: "options",
      content:
        "In the past year, how many times have you had 4 (women) or 5 (men) or more drinks in a single day?",
      options: [
        { id: "never", text: "Never", value: "never", points: 0 },
        {
          id: "less_monthly",
          text: "Less than once a month",
          value: "less_monthly",
          points: 1,
        },
        {
          id: "monthly",
          text: "1–3 times a month",
          value: "monthly",
          points: 2,
        },
        {
          id: "weekly",
          text: "1–2 times a week",
          value: "weekly",
          points: 3,
        },
        {
          id: "more_weekly",
          text: "More than twice a week",
          value: "more_weekly",
          points: 4,
        },
      ],
      nextQuestion: {
        never: "days_per_week",
        less_monthly: "days_per_week",
        monthly: "days_per_week",
        weekly: "days_per_week",
        more_weekly: "days_per_week",
      },
    },
    {
      id: "days_per_week",
      type: "options",
      content: "On average, how many days per week do you drink alcohol?",
      options: [
        { id: "0_days", text: "0 days", value: "0_days", points: 0 },
        {
          id: "1_2_days",
          text: "1–2 days",
          value: "1_2_days",
          points: 1,
        },
        {
          id: "3_4_days",
          text: "3–4 days",
          value: "3_4_days",
          points: 2,
        },
        {
          id: "5_plus_days",
          text: "5+ days",
          value: "5_plus_days",
          points: 3,
        },
      ],
      nextQuestion: {
        "0_days": "drinks_per_sitting",
        "1_2_days": "drinks_per_sitting",
        "3_4_days": "drinks_per_sitting",
        "5_plus_days": "drinks_per_sitting",
      },
    },
    {
      id: "drinks_per_sitting",
      type: "options",
      content:
        "When you drink, how many drinks do you usually have in one sitting?",
      options: [
        { id: "1_drink", text: "1 drink", value: "1_drink", points: 0 },
        {
          id: "2_3_drinks",
          text: "2–3 drinks",
          value: "2_3_drinks",
          points: 1,
        },
        {
          id: "4_5_drinks",
          text: "4–5 drinks",
          value: "4_5_drinks",
          points: 2,
        },
        {
          id: "6_plus_drinks",
          text: "6+ drinks",
          value: "6_plus_drinks",
          points: 3,
        },
      ],
      nextQuestion: {
        "1_drink": "crafft_intro",
        "2_3_drinks": "crafft_intro",
        "4_5_drinks": "crafft_intro",
        "6_plus_drinks": "crafft_intro",
      },
    },
    // CRAFFT Questions (for all users)
    {
      id: "crafft_intro",
      type: "text",
      content:
        "Now, I'd like to ask a few questions about alcohol and substance use. Just answer honestly. There are no right or wrong answers!",
      nextQuestion: "car_ride",
    },
    {
      id: "car_ride",
      type: "options",
      content:
        "Have you ever ridden in a car driven by someone (including yourself) who was high or had been using alcohol or drugs?",
      options: [
        { id: "yes", text: "Yes", value: "yes", points: 1 },
        { id: "no", text: "No", value: "no", points: 0 },
      ],
      nextQuestion: {
        yes: "relax_fit_in",
        no: "relax_fit_in",
      },
    },
    {
      id: "relax_fit_in",
      type: "options",
      content:
        "Do you ever use alcohol or drugs to relax, feel better about yourself, or fit in?",
      options: [
        { id: "yes", text: "Yes", value: "yes", points: 1 },
        { id: "no", text: "No", value: "no", points: 0 },
      ],
      nextQuestion: {
        yes: "alone_use",
        no: "alone_use",
      },
    },
    {
      id: "alone_use",
      type: "options",
      content: "Do you ever use alcohol or drugs when you are alone?",
      options: [
        { id: "yes", text: "Yes", value: "yes", points: 1 },
        { id: "no", text: "No", value: "no", points: 0 },
      ],
      nextQuestion: {
        yes: "forget_things",
        no: "forget_things",
      },
    },
    {
      id: "forget_things",
      type: "options",
      content:
        "Do you ever forget things you did while using alcohol or drugs?",
      options: [
        { id: "yes", text: "Yes", value: "yes", points: 1 },
        { id: "no", text: "No", value: "no", points: 0 },
      ],
      nextQuestion: {
        yes: "family_friends_concern",
        no: "family_friends_concern",
      },
    },
    {
      id: "family_friends_concern",
      type: "options",
      content:
        "Have your family or friends ever told you that you should cut down on your drinking or drug use?",
      options: [
        { id: "yes", text: "Yes", value: "yes", points: 1 },
        { id: "no", text: "No", value: "no", points: 0 },
      ],
      nextQuestion: {
        yes: "trouble_using",
        no: "trouble_using",
      },
    },
    {
      id: "trouble_using",
      type: "options",
      content:
        "Have you ever gotten into trouble while you were using alcohol or drugs?",
      options: [
        { id: "yes", text: "Yes", value: "yes", points: 1 },
        { id: "no", text: "No", value: "no", points: 0 },
      ],
      nextQuestion: {
        yes: "healthier_habits",
        no: "healthier_habits",
      },
    },
    {
      id: "healthier_habits",
      type: "options",
      content:
        "Based on what you've told me, would you be interested in exploring ways to build healthier habits around alcohol?",
      options: [
        { id: "yes", text: "Yes, that would be helpful", value: "yes" },
        {
          id: "maybe",
          text: "Maybe, I'm open to learning more",
          value: "maybe",
        },
        // {
        //   id: "no",
        //   text: "No, I just want general information for now",
        //   value: "no",
        // },
      ],
      nextQuestion: {
        yes: "assessment_results",
        maybe: "assessment_results",
        no: "assessment_results",
      },
    },
    {
      id: "assessment_results",
      type: "results",
      content: "Assessment Complete",
    },
  ],
  scoring: {
    riskLevels: [
      {
        min: 0,
        max: 3,
        level: "Low Risk (Safe Zone)",
        description: "Minimal alcohol use or no signs of harmful behavior",
        recommendation:
          "Provide general alcohol education and responsible drinking tips",
      },
      {
        min: 4,
        max: 7,
        level: "Moderate Risk (Caution Zone)",
        description: "Early signs of risky drinking behaviors",
        recommendation:
          "Provide strategies for controlled drinking, peer pressure management, and self-monitoring",
      },
      {
        min: 8,
        max: 12,
        level: "High Risk (Intervention Zone)",
        description:
          "Drinking habits indicate risk for health and social consequences",
        recommendation:
          "Suggest harm reduction strategies, stress management alternatives, and behavioral change techniques",
      },
      {
        min: 13,
        max: Infinity,
        level: "Severe Risk (Critical Zone)",
        description: "High likelihood of alcohol dependence or substance abuse",
        recommendation:
          "Recommend professional support, counseling, or intervention programs",
      },
    ],
  },
};

// Scenario Messages for Learning Components
export const scenarioMessages = {
  scenario1: {
    message1: {
      title: "What You'll Learn Today:",
      learningPoints: [
        "What is a Standard Drink?",
        "How Alcohol Affects the Body",
        "Alcohol Myths vs. Facts",
      ],
      sections: [
        {
          title: "What is a Standard Drink?",
          content:
            "A standard drink contains 0.6 ounces (14 g) of pure alcohol:",
          list: [
            {
              label: "Beer (5% alcohol)",
              value: "12 oz",
              emphasis: "1 can",
            },
            {
              label: "Wine (12% alcohol)",
              value: "5 oz",
              emphasis: "1 glass",
            },
            {
              label: "Liquor (40% alcohol)",
              value: "1.5 oz",
              emphasis: "1 shot",
            },
          ],
        },
      ],
      tip: "Tip: Just because a drink is smaller or lighter doesn't mean it contains less alcohol! Cocktails and mixed drinks often have more than one standard drink in them.",
    },
    message2: {
      title: "How Alcohol Affects Your Body",
      learningPoints: [
        "Short-term Effects",
        "Long-term Effects",
        "Factors That Influence Impact",
      ],
      sections: [
        {
          title: "Short-term Effects",
          content: "Alcohol affects your body in many ways:",
          list: [
            "Slows down brain function",
            "Impairs judgment and coordination",
            "Affects mood and behavior",
            "Can cause dehydration",
          ],
          listType: "disc",
        },
      ],
    },
  },
  scenario2: {
    message1: {
      title: "What You'll Learn Today:",
      learningPoints: [
        "Setting Drinking Limits",
        "How to Say No to Alcohol",
        "Alternatives to Drinking at Social Events",
      ],
      sections: [
        {
          title: "Setting Drinking Limits",
          content: "Here's how you can stay in control:",
          list: [
            "Set a drink limit before going out.",
            "Alternate between alcoholic and non-alcoholic drinks.",
            "Drink slowly—sip, don't chug!",
            "Avoid drinking games that encourage excessive drinking.",
          ],
          listType: "disc",
        },
      ],
      className: "mt-8",
    },
    message2: {
      title: "How to Say No to Alcohol (Without Feeling Awkward)",
      sections: [
        {
          title: "If Someone Offers You a Drink",
          list: [
            "No thanks, I'm good with this one.",
            "I have an early morning, so I'm skipping tonight.",
            "I'm taking a break from drinking right now.",
          ],
          listType: "disc",
        },
      ],
      tip: "Keep a non-alcoholic drink in your hand—it helps avoid repeated offers.",
      className: "mt-8",
    },
  },
  scenario3: {
    message1: {
      title: "Understanding Your Relationship with Alcohol",
      learningPoints: [
        "Signs of Risky Drinking",
        "Healthy Drinking Patterns",
        "When to Seek Help",
      ],
      sections: [
        {
          title: "Signs of Risky Drinking",
          content: "Watch out for these patterns:",
          list: [
            "Drinking more than intended",
            "Difficulty cutting down",
            "Spending a lot of time drinking",
            "Continuing despite problems",
          ],
          listType: "disc",
        },
      ],
    },
    message2: {
      title: "Healthy Drinking Patterns",
      sections: [
        {
          title: "What Does Healthy Drinking Look Like?",
          content: "Healthy drinking means:",
          list: [
            "Staying within recommended limits",
            "Not drinking to cope with problems",
            "Being able to say no",
            "Not letting drinking affect responsibilities",
          ],
          listType: "disc",
        },
      ],
      tip: "Remember: It's okay to choose not to drink at all!",
    },
  },
  scenario4: {
    message1: {
      title: "Making Positive Changes",
      learningPoints: [
        "Setting Goals",
        "Building Support",
        "Staying Motivated",
      ],
      sections: [
        {
          title: "Setting Realistic Goals",
          content: "Start with small, achievable goals:",
          list: [
            "Track your drinking for a week",
            "Set specific drink limits",
            "Plan alcohol-free days",
            "Find alternative activities",
          ],
          listType: "disc",
        },
      ],
    },
    message2: {
      title: "Building Your Support System",
      sections: [
        {
          title: "Who Can Help?",
          content: "Consider reaching out to:",
          list: [
            "Trusted friends or family",
            "Healthcare providers",
            "Support groups",
            "Professional counselors",
          ],
          listType: "disc",
        },
      ],
      tip: "You don't have to make changes alone. Support makes a big difference!",
    },
  },
};

// Scenario Questions
export const scenarioQuestions = {
  scenario1: {
    question: "Who can help you make positive changes?",
    options: [
      {
        id: "only_professionals",
        text: "Only professional counselors",
        correct: false,
        feedback:
          "Help can come from many places. Don't be afraid to reach out to different people for support.",
      },
      {
        id: "only_family",
        text: "Only family members",
        correct: false,
        feedback:
          "Help can come from many places. Don't be afraid to reach out to different people for support.",
      },
      {
        id: "many_people",
        text: "Many people including friends, family, and professionals",
        correct: true,
        feedback:
          "Correct! Support can come from many sources - friends, family, healthcare providers, and support groups.",
      },
    ],
  },
  scenario2: {
    question: "What's the best way to stay in control when drinking?",
    options: [
      {
        id: "drink_fast",
        text: "Drink quickly to get it over with",
        correct: false,
        feedback:
          "Drinking quickly can lead to intoxication faster. It's better to sip slowly and set limits.",
      },
      {
        id: "set_limits",
        text: "Set a drink limit before going out",
        correct: true,
        feedback:
          "Correct! Setting limits beforehand helps you stay in control and make better decisions.",
      },
      {
        id: "avoid_water",
        text: "Avoid drinking water between alcoholic drinks",
        correct: false,
        feedback:
          "Staying hydrated is important. Alternate between alcoholic and non-alcoholic drinks.",
      },
    ],
  },
  scenario3: {
    question: "Which is a sign of healthy drinking?",
    options: [
      {
        id: "drinking_to_cope",
        text: "Drinking to cope with problems",
        correct: false,
        feedback:
          "Using alcohol to cope with problems is a sign of unhealthy drinking patterns.",
      },
      {
        id: "being_able_to_say_no",
        text: "Being able to say no to alcohol",
        correct: true,
        feedback:
          "Correct! Being able to say no and not feeling pressured to drink is a sign of healthy drinking.",
      },
      {
        id: "drinking_every_day",
        text: "Drinking every day",
        correct: false,
        feedback:
          "Daily drinking can be a sign of dependence. Healthy drinking includes alcohol-free days.",
      },
    ],
  },
  scenario4: {
    question: "What's a good first step when making changes?",
    options: [
      {
        id: "change_everything",
        text: "Try to change everything at once",
        correct: false,
        feedback:
          "Making too many changes at once can be overwhelming. Start with small, achievable goals.",
      },
      {
        id: "track_drinking",
        text: "Track your drinking for a week",
        correct: true,
        feedback:
          "Correct! Tracking your drinking helps you understand your patterns and set realistic goals.",
      },
      {
        id: "avoid_support",
        text: "Try to make changes alone",
        correct: false,
        feedback:
          "Support from others can make a big difference. Don't be afraid to reach out for help.",
      },
    ],
  },
};

// Scenario Simulation and Practice Data
export const scenarioSimulations = {
  peer_pressure_party: {
    title: "Scenario 1: Peer Pressure at a Party",
    description:
      "You're at a party, hanging out with friends, when someone passes you a drink and says:",
    prompt: "Come on, just one won't hurt!",
    appropriateExample: "I'm good. I'm not drinking tonight.",
    inappropriateExamples: ["Accepting the drink or avoiding the question"],
    scenarioKey: "peer_pressure_party",
  },
  pre_game_event: {
    title: "Scenario 2: Friends Planning to Pre-Game Before an Event",
    description:
      "Your friends say they're going to pre-game before the concert and ask if you're in. One says:",
    prompt: "It'll be more fun if you're not the only sober one.",
    appropriateExample: "Let's just get food before instead.",
    inappropriateExamples: ["Saying yes or giving in to pressure"],
    scenarioKey: "pre_game_event",
  },
  romantic_interest: {
    title: "Scenario 3: Being Offered a Drink by a Romantic Interest",
    description: "You're on a first date. They order drinks and say:",
    prompt: "Let's have some fun tonight!",
    additionalContext: "But you weren't planning to drink.",
    appropriateExample: "I don't really drink much, but cheers to you.",
    inappropriateExamples: ["Giving in to avoid awkwardness"],
    scenarioKey: "romantic_interest",
  },
  stressful_week: {
    title: "Scenario 4: After a Stressful Week",
    description: "It's been a long week. A friend says:",
    prompt: "Let's just drink and forget everything—come on, you deserve it.",
    appropriateExample: "I just want a quiet night—maybe next time.",
    inappropriateExamples: ["Agreeing just to cope"],
    scenarioKey: "stressful_week",
  },
};
