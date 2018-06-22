import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const stepWithCorrectAnswerYaml = `---
- step: choice
  key: randomsaying
  correct: again
  choices:
    - where: Where's he get it all from?
    - temper: This hell of a temper
    - again: It's so good to see you again
    - beautiful: It's beautiful when he talks to you
`;
const getStepWithCorrectAnswer = () => MockGameManager.loadStepFromYaml(stepWithCorrectAnswerYaml);


// In this type of multiple choice question, all answers are valid and there is no "right answer"
const stepWithEquallyValidChoicesYaml = `---
- step: choice
  key: example2
  choices:
    - first: Option 1
    - second: Option 2
    - third: Option 3
`;
const getStepWithEquallyValidChoices = () => MockGameManager.loadStepFromYaml(stepWithEquallyValidChoicesYaml);


describe("Choice Step tests", () => {


    it("raises an error if trying to make an invalid choice", async () => {
        const step = getStepWithCorrectAnswer();
        step.run();
        const submitAnswer = () => step.handleResponse({stepId: 1, choiceId: "invalid"});
        await expect(submitAnswer()).rejects.toHaveProperty('message', "Invalid choice.");
    });

    it("raises an error if trying to make a choice twice", async () => {
        const step = getStepWithCorrectAnswer();
        step.run();
        const submitAnswer = () => step.handleResponse({stepId: 1, choiceId: "again"});
        await submitAnswer();
        await expect(submitAnswer()).rejects.toHaveProperty('message', "Choice already made.");
    });

    describe("when there is a correct answer", () => {
        it("returns the expected UI State", async () => {
            const step = getStepWithCorrectAnswer();
            step.run();
            expect(step.getUiState()).toEqual({
                stepId: 1,
                type: StepType.MultipleChoice,
                choiceMade: false,
                choices: [
                    {correct: null, "selected": false, id: "where", choiceText: "Where's he get it all from?"},
                    {correct: null, "selected": false, id: "temper", choiceText: "This hell of a temper"},
                    {correct: null, "selected": false, id: "again", choiceText: "It's so good to see you again"},
                    {correct: null, "selected": false, id: "beautiful", choiceText: "It's beautiful when he talks to you"},
                ]
            });
        });
        it("sets correct and selected true if the user chooses the correct answer", async () => {
            const step = getStepWithCorrectAnswer();
            step.run();
            await step.handleResponse({stepId: 1, choiceId: "again"}); // Choose the correct answer
            expect(step.getUiState()).toEqual({
                stepId: 1,
                type: StepType.MultipleChoice,
                choiceMade: true,
                //          ^^^^
                choices: [
                    {correct: null, "selected": false, id: "where", choiceText: "Where's he get it all from?"},
                    {correct: null, "selected": false, id: "temper", choiceText: "This hell of a temper"},
                    {correct: true, "selected": true, id: "again", choiceText: "It's so good to see you again"},
                    // Here   ^^^^              ^^^^
                    {correct: null, "selected": false, id: "beautiful", choiceText: "It's beautiful when he talks to you"},
                ]
            });
        });
        it("sets correct false, selected true, and other answer as correct if the user chooses the wrong answer", async () => {
            const step = getStepWithCorrectAnswer();
            step.run();
            await step.handleResponse({stepId: 1, choiceId: "temper"}); // Choose the wrong answer
            expect(step.getUiState()).toEqual({
                stepId: 1,
                type: StepType.MultipleChoice,
                choiceMade: true,
                //          ^^^^
                choices: [
                    {correct: null, "selected": false, id: "where", choiceText: "Where's he get it all from?"},
                    {correct: false, "selected": true, id: "temper", choiceText: "This hell of a temper"},
                    // Here   ^^^^^              ^^^^
                    {correct: true, "selected": false, id: "again", choiceText: "It's so good to see you again"},
                    // Here   ^^^^
                    {correct: null, "selected": false, id: "beautiful", choiceText: "It's beautiful when he talks to you"},
                ]
            });
        });
    });

    describe("when all choices are equally valid", () => {
        it("returns the expected UI State", async () => {
            const step = getStepWithEquallyValidChoices();
            step.run();
            expect(step.getUiState()).toEqual({
                stepId: 1,
                type: StepType.MultipleChoice,
                choiceMade: false,
                choices: [
                    {correct: null, "selected": false, id: "first", choiceText: "Option 1"},
                    {correct: null, "selected": false, id: "second", choiceText: "Option 2"},
                    {correct: null, "selected": false, id: "third", choiceText: "Option 3"},
                ]
            });
        });
        it("sets selected true (and keeps correct null) when the user picks a choice", async () => {
            const step = getStepWithEquallyValidChoices();
            step.run();
            await step.handleResponse({stepId: 1, choiceId: "second"}); // Choose the second answer
            expect(step.getUiState()).toEqual({
                stepId: 1,
                type: StepType.MultipleChoice,
                choiceMade: true,
                //          ^^^^
                choices: [
                    {correct: null, "selected": false, id: "first", choiceText: "Option 1"},
                    {correct: null, "selected": true, id: "second", choiceText: "Option 2"},
                    //                          ^^^^
                    {correct: null, "selected": false, id: "third", choiceText: "Option 3"},
                ]
            });
        });
    });
});
