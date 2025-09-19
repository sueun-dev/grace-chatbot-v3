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
        "Now, I'd like to ask a few questions about alcohol use. Just answer honestly. There are no right or wrong answers!",
      nextQuestion: "car_ride",
    },
    {
      id: "car_ride",
      type: "options",
      content:
        "Have you ever ridden in a car driven by someone (including yourself) who was high or had been using alcohol?",
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
        "Do you ever use alcohol to relax, feel better about yourself, or fit in?",
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
      content: "Do you ever use alcohol when you are alone?",
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
      content: "Do you ever forget things you did while using alcohol?",
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
        "Have your family or friends ever told you that you should cut down on your drinking?",
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
        "Have you ever gotten into trouble while you were using alcohol?",
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
        // {
        //   id: "maybe",
        //   text: "Maybe, I'm open to learning more",
        //   value: "maybe",
        // },
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
        description: "Early Signs of Risky Drinking behaviors",
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
  scenario1: [
    {
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
            { label: "Beer (5% alcohol)", value: "12 oz", emphasis: "1 can" },
            { label: "Wine (12% alcohol)", value: "5 oz", emphasis: "1 glass" },
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
    {
      title: "How Alcohol Affects Your Body",
      sections: [
        {
          title: "Alcohol affects different parts of your body, including:",
          list: [
            "Brain – Slows down processing speed and decision-making.",
            "Liver – Can cause damage over time with excessive use.",
            "Sleep – Can interfere with deep sleep cycles.",
          ],
          listType: "disc",
        },
        {
          title: "Did You Know?",
          content:
            "Even small amounts of alcohol can impair judgment and coordination, making activities like driving dangerous.",
        },
        {
          title: "Myths vs. Facts",
          list: [
            'Myth: "Drinking coffee will sober you up."',
            "Fact: Only time helps your body process alcohol. Coffee won’t make you sober—just more awake.",
            'Myth: "If I don’t feel drunk, I’m okay to drive."',
            "Fact: Alcohol can impair judgment before you feel drunk.",
          ],
          listType: "disc",
        },
      ],
    },
  ],
  scenario2: [
    {
      title: "Setting Drinking Limits",
      sections: [
        { content: "Here's how you can stay in control:" },
        {
          list: [
            "Set a drink limit before going out.",
            "Alternate between alcoholic and non-alcoholic drinks.",
            "Drink slowly—sip, don't chug!",
            "Avoid drinking games that encourage excessive drinking.",
          ],
          listType: "disc",
        },
      ],
    },
    {
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
    },
    {
      title: "Alternatives to Drinking",
      sections: [
        { content: "Not drinking? You can still have fun!" },
        {
          list: [
            "Try a mocktail instead of alcohol.",
            "Be the designated driver for the night.",
            "Get involved in games, dancing, or socializing.",
          ],
          listType: "disc",
        },
      ],
    },
  ],
  scenario3: [
    {
      title: "Recognizing Problematic Drinking",
      sections: [
        { content: "Signs that drinking is becoming a problem:" },
        {
          list: [
            "Drinking more than you planned.",
            "Feeling guilty about drinking.",
            "Drinking to cope with stress or emotions.",
            "Blacking out or forgetting events while drinking.",
          ],
          listType: "disc",
        },
        {
          content:
            "Tip: If you notice these signs, it might be time to take a step back and reevaluate your drinking habits.",
        },
      ],
    },
    {
      title: "Stress Management Without Alcohol",
      sections: [
        { content: "Instead of drinking when stressed, try these:" },
        {
          list: [
            "Exercise – Running, yoga, or gym workouts.",
            "Mindfulness – Meditation or deep breathing.",
            "Hobbies – Painting, gaming, or reading.",
            "Talking – Reaching out to a friend or therapist.",
          ],
          listType: "disc",
        },
      ],
    },
    {
      title: "Practical Tips for Cutting Back on Alcohol",
      sections: [
        {
          list: [
            "Set a Drink Limit: Decide how many drinks you’ll have—and stick to it.",
            "Alternate with Water: Have a glass of water or soda between alcoholic drinks.",
            "Avoid Drinking Games: They make it easy to lose track.",
            "Eat Before & During Drinking: Food slows absorption.",
            "Drink Slowly: Take sips, not gulps.",
          ],
          listType: "disc",
        },
      ],
    },
  ],
  scenario4: [
    {
      title: "Understanding Alcohol Dependence",
      sections: [
        { content: "Signs of alcohol dependence:" },
        {
          list: [
            "Drinking even when it causes problems.",
            "Feeling the need to drink.",
            "Experiencing withdrawal symptoms (shakiness, anxiety).",
          ],
          listType: "disc",
        },
        {
          content:
            "Fact: If you find it hard to stop drinking once you start, seeking support can help.",
        },
      ],
    },
    {
      title: "How to Cut Back Safely",
      sections: [
        {
          list: [
            "Gradually reduce drinking instead of stopping suddenly.",
            "Set a plan (e.g., no more than 2 drinks per occasion).",
            "Find a support system (friends, family, therapist).",
          ],
          listType: "disc",
        },
      ],
    },
    {
      title: "Where to Get Help",
      sections: [
        {
          list: [
            "Helplines & Support Groups",
            "Counseling & Treatment Programs",
            "Self-Help Guides",
          ],
          listType: "disc",
        },
      ],
    },
  ],
};

// Scenario Questions
export const scenarioQuestions = {
  scenario1: [
    [
      {
        question: "What do you think counts as a 'standard drink'?",
        options: [
          {
            id: "std_correct",
            text: "A full glass of wine, a bottle of beer, or a shot of liquor",
            correct: true,
            feedback:
              "Yes! A standard drink is:\n  12 oz beer (5% alcohol)\n  5 oz wine (12% alcohol)\n  1.5 oz liquor (40% alcohol, e.g., vodka, whiskey)",
          },
          {
            id: "std_any_cup",
            text: "Any amount of alcohol in a cup",
            correct: false,
            feedback:
              "Not quite! The amount of liquid isn’t what matters—it’s the alcohol content inside the drink. A cocktail can actually have multiple standard drinks in one glass!",
          },
          {
            id: "std_cocktail_multi",
            text: "A cocktail with multiple types of alcohol",
            correct: false,
            feedback:
              "Not quite! Cocktails often contain more than one standard drink depending on ingredients and pour sizes.",
          },
        ],
      },
    ],
    [
      {
        question: "If I don’t feel drunk, am I okay to drive?",
        options: [
          {
            id: "drive_yes",
            text: "Yes, if I feel fine, I’m good to drive.",
            correct: false,
            feedback:
              "Be careful! You may not feel drunk, but even small amounts of alcohol slow down your reaction time and thinking.",
          },
          {
            id: "drive_no",
            text: "No, alcohol can affect me before I feel drunk.",
            correct: true,
            feedback:
              "Exactly! Alcohol impairs judgment and reaction time before you actually ‘feel’ drunk.",
          },
        ],
      },
    ],
  ],
  scenario2: [
    [
      {
        question:
          "How long does it take for your body to process ONE standard drink?",
        options: [
          {
            id: "15_min",
            text: "15 minutes",
            correct: false,
            feedback:
              "Actually, it takes about one hour per drink. If you drink multiple drinks in a short period, the alcohol stays in your system longer.",
          },
          {
            id: "1_hour",
            text: "1 hour",
            correct: true,
            feedback:
              "Yes! On average, your liver processes about one standard drink per hour. Drinking faster than this means your body can’t keep up, leading to intoxication.",
          },
          {
            id: "3_hours",
            text: "3 hours",
            correct: false,
            feedback: "It’s closer to one hour per drink on average.",
          },
        ],
      },
    ],
    [
      {
        question:
          "You’re at a party, and a friend offers you a drink. You don’t want to drink tonight—how do you respond?",
        options: [
          {
            id: "no_thanks",
            text: "No thanks, I’m good with this one.",
            correct: true,
            feedback:
              "Great choice! Keeping it simple and confident works best. Most people respect a direct but friendly response.",
          },
          {
            id: "early_morning",
            text: "I have an early morning, so I’m skipping tonight.",
            correct: true,
            feedback:
              "Great choice! Keeping it simple and confident works best. Most people respect a direct but friendly response.",
          },
          {
            id: "taking_break",
            text: "I’m taking a break from drinking right now.",
            correct: true,
            feedback:
              "Great choice! Keeping it simple and confident works best. Most people respect a direct but friendly response.",
          },
          {
            id: "give_in",
            text: "Uhh… I don’t know, I guess I’ll take it.",
            correct: false,
            feedback:
              "It can be hard to say no, but remember—you always have the choice. Want to see some strategies for handling these situations?",
          },
        ],
      },
    ],
    [
      {
        question:
          "Let’s say you’re at a party, and you don’t feel like drinking. What’s a fun alternative?",
        options: [
          {
            id: "mocktail",
            text: "Try a mocktail instead of alcohol",
            correct: true,
            feedback:
              "Exactly! There are plenty of ways to enjoy yourself without drinking.",
          },
          {
            id: "dd",
            text: "Be the designated driver for the night",
            correct: true,
            feedback:
              "Exactly! There are plenty of ways to enjoy yourself without drinking.",
          },
          {
            id: "activities",
            text: "Get involved in games, dancing, or socializing",
            correct: true,
            feedback:
              "Exactly! There are plenty of ways to enjoy yourself without drinking.",
          },
          {
            id: "awkward",
            text: "Stand awkwardly in the corner and pretend to text",
            correct: false,
            feedback:
              "That doesn’t sound like much fun! There are better ways to enjoy the party. Want to see some easy conversation starters?",
          },
        ],
      },
    ],
  ],
  scenario3: [
    [
      {
        question: "Have you ever felt guilty about drinking?",
        options: [
          {
            id: "guilty_yes",
            text: "Yes, sometimes I regret drinking.",
            correct: true,
            feedback:
              "That feeling of guilt can be a sign that drinking is affecting you in ways you don’t want it to. Want some tips on cutting back?",
          },
          {
            id: "guilty_no",
            text: "No, I don’t feel bad about it.",
            correct: true,
            feedback:
              "That’s good! If drinking ever starts to make you feel bad emotionally, it’s okay to take a step back and reflect.",
          },
        ],
      },
    ],
    [
      {
        question:
          "Which of these is a good alternative to drinking when stressed?",
        options: [
          {
            id: "stress_exercise",
            text: "Running or yoga",
            correct: true,
            feedback: "Great choice!",
          },
          {
            id: "stress_hobby",
            text: "Painting or playing video games",
            correct: true,
            feedback: "Great choice!",
          },
          {
            id: "stress_call",
            text: "Calling a friend",
            correct: true,
            feedback: "Great choice!",
          },
          {
            id: "stress_all",
            text: "All of the above",
            correct: true,
            feedback:
              "That’s right! There are so many ways to manage stress without alcohol. Finding what works best for you is key.",
          },
        ],
      },
    ],
    [
      {
        question: "Which of these tips do you think would work best for you?",
        options: [
          {
            id: "tip_limit",
            text: "Setting a drink limit",
            correct: true,
            feedback:
              "Great choice! Even one small change can help you drink less.",
          },
          {
            id: "tip_water",
            text: "Alternating drinks with water",
            correct: true,
            feedback:
              "Great choice! Even one small change can help you drink less.",
          },
          {
            id: "tip_games",
            text: "Avoiding drinking games",
            correct: true,
            feedback:
              "Great choice! Even one small change can help you drink less.",
          },
          {
            id: "tip_slow",
            text: "Drinking more slowly",
            correct: true,
            feedback:
              "Great choice! Even one small change can help you drink less.",
          },
        ],
      },
    ],
  ],
  scenario4: [
    [
      {
        question:
          "If drinking started causing problems in your work, school, or relationships, what would you do?",
        options: [
          {
            id: "cut_back",
            text: "Try to cut back on my own.",
            correct: true,
            feedback:
              "That’s a good step! Cutting back can help, but having a plan or support system can make it easier. Want some tips?",
          },
          {
            id: "talk_someone",
            text: "Talk to someone I trust.",
            correct: true,
            feedback:
              "Talking to someone is a great idea! Support from friends, family, or a professional can make a big difference.",
          },
          {
            id: "ignore",
            text: "Ignore it and hope it improves.",
            correct: false,
            feedback:
              "Ignoring it might seem easier, but problems tend to grow over time. Want to see some simple ways to manage drinking?",
          },
        ],
      },
    ],
    [
      {
        question: "What’s a good strategy to help limit alcohol consumption?",
        options: [
          {
            id: "limit",
            text: "Set a drink limit before going out.",
            correct: false,
            feedback:
              "Close—combining multiple strategies works best. Consider spacing drinks and getting support too.",
          },
          {
            id: "space",
            text: "Space out drinks with water or food.",
            correct: false,
            feedback:
              "Close—combining multiple strategies works best. Consider limits and support too.",
          },
          {
            id: "support",
            text: "Find supportive friends or family to check in with.",
            correct: false,
            feedback:
              "Close—combining multiple strategies works best. Consider limits and spacing drinks too.",
          },
          {
            id: "all_above",
            text: "All of the above.",
            correct: true,
            feedback:
              "That’s right! Setting limits, drinking water, and having a support system all help you drink less.",
          },
        ],
      },
    ],
    [
      {
        question:
          "If you needed help with drinking, where would you feel most comfortable starting?",
        options: [
          {
            id: "friend_family",
            text: "Talking to a trusted friend or family member.",
            correct: true,
            feedback:
              "That’s a great step! Taking action with someone you trust can really help.",
          },
          {
            id: "online",
            text: "Looking up online resources or self-help guides.",
            correct: true,
            feedback:
              "That’s a great step! Taking action with good resources can help.",
          },
          {
            id: "counselor",
            text: "Reaching out to a counselor or support group.",
            correct: true,
            feedback:
              "That’s a great step! Professional support can make a big difference.",
          },
          {
            id: "not_sure",
            text: "I’m not sure—I haven’t thought about it.",
            correct: true,
            feedback:
              "That’s okay! If you ever want to explore options, I can share resources with you.",
          },
        ],
      },
    ],
  ],
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
