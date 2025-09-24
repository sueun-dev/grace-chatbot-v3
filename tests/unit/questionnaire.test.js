/**
 * Unit tests for questionnaire utility
 * Tests questionnaire schema, scenario messages, and data integrity
 */

import {
  QUESTIONNAIRE_SCHEMA,
  scenarioMessages,
  scenarioQuestions,
  scenarioSimulations
} from '@/utils/questionnaire';

describe('Questionnaire Data Structure Tests', () => {

  describe('QUESTIONNAIRE_SCHEMA', () => {
    test('should have valid schema structure', () => {
      expect(QUESTIONNAIRE_SCHEMA).toBeDefined();
      expect(QUESTIONNAIRE_SCHEMA.id).toBe('alcohol-awareness-assessment');
      expect(QUESTIONNAIRE_SCHEMA.title).toBeTruthy();
      expect(QUESTIONNAIRE_SCHEMA.description).toBeTruthy();
      expect(Array.isArray(QUESTIONNAIRE_SCHEMA.questions)).toBe(true);
      expect(QUESTIONNAIRE_SCHEMA.scoring).toBeDefined();
    });

    test('should have valid questions array', () => {
      const { questions } = QUESTIONNAIRE_SCHEMA;
      expect(questions.length).toBeGreaterThan(0);

      questions.forEach(question => {
        expect(question.id).toBeDefined();
        expect(question.type).toBeDefined();
        expect(question.content).toBeDefined();

        if (question.type === 'options') {
          expect(Array.isArray(question.options)).toBe(true);
          expect(question.options.length).toBeGreaterThan(0);
          expect(question.nextQuestion).toBeDefined();
        }
      });
    });

    test('should have valid options structure', () => {
      const optionQuestions = QUESTIONNAIRE_SCHEMA.questions.filter(q => q.type === 'options');

      optionQuestions.forEach(question => {
        question.options.forEach(option => {
          expect(option.id).toBeDefined();
          expect(option.text).toBeDefined();
          expect(option.value).toBeDefined();
        });
      });
    });

    test('should have valid navigation flow', () => {
      const questionIds = QUESTIONNAIRE_SCHEMA.questions.map(q => q.id);
      const optionQuestions = QUESTIONNAIRE_SCHEMA.questions.filter(q => q.type === 'options');

      optionQuestions.forEach(question => {
        if (typeof question.nextQuestion === 'object') {
          Object.values(question.nextQuestion).forEach(nextId => {
            // Next question should either exist in schema or be a special end state
            const isValidNext = questionIds.includes(nextId) ||
                              nextId === 'assessment_end' ||
                              nextId === 'assessment_results';
            expect(isValidNext).toBe(true);
          });
        } else if (typeof question.nextQuestion === 'string') {
          const isValidNext = questionIds.includes(question.nextQuestion) ||
                            question.nextQuestion === 'assessment_end' ||
                            question.nextQuestion === 'assessment_results';
          expect(isValidNext).toBe(true);
        }
      });
    });

    test('should have points assigned to relevant options', () => {
      const scoredQuestions = ['drinking_frequency', 'binge_drinking', 'days_per_week',
                               'drinks_per_sitting', 'car_ride', 'relax_fit_in',
                               'alone_use', 'forget_things', 'family_friends_concern',
                               'trouble_using'];

      scoredQuestions.forEach(questionId => {
        const question = QUESTIONNAIRE_SCHEMA.questions.find(q => q.id === questionId);
        if (question && question.options) {
          question.options.forEach(option => {
            expect(option.points).toBeDefined();
            expect(typeof option.points).toBe('number');
            expect(option.points).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });

    test('should have valid scoring risk levels', () => {
      const { riskLevels } = QUESTIONNAIRE_SCHEMA.scoring;

      expect(Array.isArray(riskLevels)).toBe(true);
      expect(riskLevels.length).toBe(4);

      riskLevels.forEach((level, index) => {
        expect(level.min).toBeDefined();
        expect(level.max).toBeDefined();
        expect(level.level).toBeDefined();
        expect(level.description).toBeDefined();
        expect(level.recommendation).toBeDefined();

        // Check that risk levels don't overlap
        if (index > 0) {
          expect(level.min).toBeGreaterThan(riskLevels[index - 1].min);
        }
      });
    });

    test('should have continuous scoring coverage', () => {
      const { riskLevels } = QUESTIONNAIRE_SCHEMA.scoring;

      // Check that scoring covers all possible values from 0 to high scores
      expect(riskLevels[0].min).toBe(0);
      expect(riskLevels[riskLevels.length - 1].max).toBe(Infinity);

      // Check no gaps in scoring ranges
      for (let i = 1; i < riskLevels.length; i++) {
        expect(riskLevels[i].min).toBe(riskLevels[i - 1].max + 1);
      }
    });
  });

  describe('scenarioMessages', () => {
    test('should have messages for all scenarios', () => {
      expect(scenarioMessages).toBeDefined();
      expect(scenarioMessages.scenario1).toBeDefined();
      expect(scenarioMessages.scenario2).toBeDefined();
      expect(scenarioMessages.scenario3).toBeDefined();
      expect(scenarioMessages.scenario4).toBeDefined();
    });

    test('should have valid message structure', () => {
      Object.values(scenarioMessages).forEach(scenario => {
        expect(scenario.message1).toBeDefined();
        expect(scenario.message2).toBeDefined();

        // Check message1 structure
        expect(scenario.message1.title).toBeDefined();
        if (scenario.message1.learningPoints) {
          expect(Array.isArray(scenario.message1.learningPoints)).toBe(true);
        }
        if (scenario.message1.sections) {
          expect(Array.isArray(scenario.message1.sections)).toBe(true);
        }
      });
    });

    test('should have valid sections structure', () => {
      Object.values(scenarioMessages).forEach(scenario => {
        [scenario.message1, scenario.message2].forEach(message => {
          if (message.sections) {
            message.sections.forEach(section => {
              expect(section.title).toBeDefined();
              if (section.list) {
                expect(Array.isArray(section.list)).toBe(true);
              }
            });
          }
        });
      });
    });

    test('should have tips where appropriate', () => {
      const messagesWithTips = [
        scenarioMessages.scenario1.message1,
        scenarioMessages.scenario2.message2,
        scenarioMessages.scenario3.message2,
        scenarioMessages.scenario4.message2
      ];

      messagesWithTips.forEach(message => {
        expect(message.tip).toBeDefined();
        expect(typeof message.tip).toBe('string');
        expect(message.tip.length).toBeGreaterThan(0);
      });
    });
  });

  describe('scenarioQuestions', () => {
    test('should have questions for all scenarios', () => {
      expect(scenarioQuestions).toBeDefined();
      expect(scenarioQuestions.scenario1).toBeDefined();
      expect(scenarioQuestions.scenario2).toBeDefined();
      expect(scenarioQuestions.scenario3).toBeDefined();
      expect(scenarioQuestions.scenario4).toBeDefined();
    });

    test('should have valid question structure', () => {
      Object.values(scenarioQuestions).forEach(scenario => {
        expect(scenario.question).toBeDefined();
        expect(typeof scenario.question).toBe('string');
        expect(Array.isArray(scenario.options)).toBe(true);
        expect(scenario.options.length).toBeGreaterThan(0);
      });
    });

    test('should have exactly one correct answer per question', () => {
      Object.entries(scenarioQuestions).forEach(([scenarioKey, scenario]) => {
        const correctAnswers = scenario.options.filter(opt => opt.correct === true);
        expect(correctAnswers.length).toBe(1);
      });
    });

    test('should have feedback for all options', () => {
      Object.values(scenarioQuestions).forEach(scenario => {
        scenario.options.forEach(option => {
          expect(option.id).toBeDefined();
          expect(option.text).toBeDefined();
          expect(typeof option.correct).toBe('boolean');
          expect(option.feedback).toBeDefined();
          expect(typeof option.feedback).toBe('string');
        });
      });
    });

    test('should have unique option IDs within each question', () => {
      Object.values(scenarioQuestions).forEach(scenario => {
        const optionIds = scenario.options.map(opt => opt.id);
        const uniqueIds = new Set(optionIds);
        expect(uniqueIds.size).toBe(optionIds.length);
      });
    });
  });

  describe('scenarioSimulations', () => {
    test('should have all required scenarios', () => {
      expect(scenarioSimulations).toBeDefined();
      expect(scenarioSimulations.peer_pressure_party).toBeDefined();
      expect(scenarioSimulations.pre_game_event).toBeDefined();
      expect(scenarioSimulations.romantic_interest).toBeDefined();
      expect(scenarioSimulations.stressful_week).toBeDefined();
    });

    test('should have valid simulation structure', () => {
      Object.entries(scenarioSimulations).forEach(([key, simulation]) => {
        expect(simulation.title).toBeDefined();
        expect(simulation.description).toBeDefined();
        expect(simulation.prompt).toBeDefined();
        expect(simulation.appropriateExample).toBeDefined();
        expect(Array.isArray(simulation.inappropriateExamples)).toBe(true);
        expect(simulation.scenarioKey).toBe(key);
      });
    });

    test('should have scenario keys matching object keys', () => {
      Object.entries(scenarioSimulations).forEach(([key, simulation]) => {
        expect(simulation.scenarioKey).toBe(key);
      });
    });

    test('should have appropriate and inappropriate examples', () => {
      Object.values(scenarioSimulations).forEach(simulation => {
        expect(simulation.appropriateExample.length).toBeGreaterThan(0);
        expect(simulation.inappropriateExamples.length).toBeGreaterThan(0);

        simulation.inappropriateExamples.forEach(example => {
          expect(typeof example).toBe('string');
          expect(example.length).toBeGreaterThan(0);
        });
      });
    });

    test('should have unique titles for each scenario', () => {
      const titles = Object.values(scenarioSimulations).map(s => s.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });
  });

  describe('Data Integrity and Cross-References', () => {
    test('should have consistent scenario numbering', () => {
      const scenarioKeys = ['scenario1', 'scenario2', 'scenario3', 'scenario4'];

      scenarioKeys.forEach(key => {
        expect(scenarioMessages[key]).toBeDefined();
        expect(scenarioQuestions[key]).toBeDefined();
      });
    });

    test('should have no undefined references in navigation', () => {
      const allQuestionIds = QUESTIONNAIRE_SCHEMA.questions.map(q => q.id);
      const validEndStates = ['assessment_end', 'assessment_results'];

      // Known questions with commented-out options but preserved navigation paths
      const questionsWithDisabledOptions = {
        'continue_assessment': ['no'],  // 'no' option is commented out
        'healthier_habits': ['maybe', 'no']  // 'maybe' and 'no' options are commented out
      };

      QUESTIONNAIRE_SCHEMA.questions.forEach(question => {
        if (question.nextQuestion) {
          if (typeof question.nextQuestion === 'string') {
            const isValid = allQuestionIds.includes(question.nextQuestion) ||
                          validEndStates.includes(question.nextQuestion);
            expect(isValid).toBe(true);
          } else if (typeof question.nextQuestion === 'object') {
            Object.entries(question.nextQuestion).forEach(([optionId, nextId]) => {
              // Check that option exists in the question (unless it's a known disabled option)
              if (question.options) {
                const isKnownDisabled = questionsWithDisabledOptions[question.id]?.includes(optionId);
                if (!isKnownDisabled) {
                  const optionExists = question.options.some(opt => opt.id === optionId);
                  expect(optionExists).toBe(true);
                }
              }

              // Check that next question is valid
              const isValid = allQuestionIds.includes(nextId) ||
                            validEndStates.includes(nextId);
              expect(isValid).toBe(true);
            });
          }
        }
      });
    });

    test('should have consistent data types across similar fields', () => {
      // Check all points are numbers
      QUESTIONNAIRE_SCHEMA.questions.forEach(question => {
        if (question.options) {
          question.options.forEach(option => {
            if (option.points !== undefined) {
              expect(typeof option.points).toBe('number');
            }
          });
        }
      });

      // Check all feedback is strings
      Object.values(scenarioQuestions).forEach(scenario => {
        scenario.options.forEach(option => {
          expect(typeof option.feedback).toBe('string');
        });
      });
    });

    test('should have complete CRAFFT questionnaire implementation', () => {
      const crafftQuestions = [
        'car_ride',
        'relax_fit_in',
        'alone_use',
        'forget_things',
        'family_friends_concern',
        'trouble_using'
      ];

      crafftQuestions.forEach(questionId => {
        const question = QUESTIONNAIRE_SCHEMA.questions.find(q => q.id === questionId);
        expect(question).toBeDefined();
        expect(question.options).toBeDefined();

        // CRAFFT questions should have yes/no options with 0/1 points
        const yesOption = question.options.find(opt => opt.id === 'yes');
        const noOption = question.options.find(opt => opt.id === 'no');

        expect(yesOption).toBeDefined();
        expect(yesOption.points).toBe(1);
        expect(noOption).toBeDefined();
        expect(noOption.points).toBe(0);
      });
    });
  });

  describe('Content Validation', () => {
    test('should have appropriate content length', () => {
      // Check that questions are not too short or too long
      QUESTIONNAIRE_SCHEMA.questions.forEach(question => {
        expect(question.content.length).toBeGreaterThan(10);
        expect(question.content.length).toBeLessThan(500);
      });

      // Check option text length
      QUESTIONNAIRE_SCHEMA.questions.forEach(question => {
        if (question.options) {
          question.options.forEach(option => {
            expect(option.text.length).toBeGreaterThan(0);
            expect(option.text.length).toBeLessThan(100);
          });
        }
      });
    });

    test('should have no duplicate question IDs', () => {
      const questionIds = QUESTIONNAIRE_SCHEMA.questions.map(q => q.id);
      const uniqueIds = new Set(questionIds);
      expect(uniqueIds.size).toBe(questionIds.length);
    });

    test('should have no empty strings in critical fields', () => {
      QUESTIONNAIRE_SCHEMA.questions.forEach(question => {
        expect(question.id).not.toBe('');
        expect(question.content).not.toBe('');
        expect(question.type).not.toBe('');

        if (question.options) {
          question.options.forEach(option => {
            expect(option.id).not.toBe('');
            expect(option.text).not.toBe('');
            expect(option.value).not.toBe('');
          });
        }
      });
    });
  });
});