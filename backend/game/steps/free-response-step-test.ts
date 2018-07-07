import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const stepYaml = `---
- step: free response
  key: testInput
`;
const getStep = () => MockGameManager.loadStepFromYaml(stepYaml);


describe("Free Response Step tests", () => {

    it("raises an error if trying to submit an invalid answer", async () => {
        const step = getStep();
        step.run();
        const submitAnswer = () => step.handleResponse({stepId: 1, value: ""});
        await expect(submitAnswer()).rejects.toHaveProperty('message', "Invalid input (empty).");
    });

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
        });
    });

});
