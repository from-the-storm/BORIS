import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const getStep = () => MockGameManager.loadStepFromYaml(`---
- step: free response
  key: testInput
`);
const getStepWithAllowedValues  = () => MockGameManager.loadStepFromYaml(`---
- step: free response
  key: testInput
  allowed:
    - banana
    - peach
    - ORANGE
`);


describe("Free Response Step tests", () => {

    it("raises an error if trying to make a choice twice", async () => {
        const step = getStep();
        step.run();
        const submitAnswer = () => step.handleResponse({stepId: 1, value: "hello"});
        await submitAnswer();
        await expect(submitAnswer()).rejects.toHaveProperty('message', "Choice already made.");
    });

    it("returns the expected UI State", async () => {
        const step = getStep();
        step.run();
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.FreeResponse,
            multiline: false,
            complete: false,
            value: "",
            invalidGuesses: [],
        });
    });

    it("returns the expected UI State after an empty answer has been submitted", async () => {
        const step = getStepWithAllowedValues();
        step.run();
        await step.handleResponse({stepId: 1, value: ""});
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.FreeResponse,
            multiline: false,
            complete: false,
            value: "",
            invalidGuesses: [""],
        });
    });

    it("returns the expected UI State after an answer has been submitted", async () => {
        const step = getStep();
        step.run();
        await step.handleResponse({stepId: 1, value: "hello world"});
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.FreeResponse,
            multiline: false,
            complete: true,
            //        ^^^^
            value: "hello world",
            //     ^^^^^^^^^^^^^
            invalidGuesses: [],
        });
    });

    it("returns the expected UI State after invalid answers have been submitted", async () => {
        const step = getStepWithAllowedValues();
        step.run();
        // Apple should not be accepted:
        await step.handleResponse({stepId: 1, value: "apple"});
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.FreeResponse,
            multiline: false,
            complete: false,
            value: "",
            invalidGuesses: ["apple"],
        });
        // Nor should plum:
        await step.handleResponse({stepId: 1, value: "PLUM"});
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.FreeResponse,
            multiline: false,
            complete: false,
            value: "",
            invalidGuesses: ["apple", "PLUM"],
        });
        // But orange should (case-insensitive):
        await step.handleResponse({stepId: 1, value: "orange"});
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.FreeResponse,
            multiline: false,
            complete: true,
            //        ^^^^
            value: "orange",
            //      ^^^^^^
            invalidGuesses: ["apple", "PLUM"],
        });
    });

});
