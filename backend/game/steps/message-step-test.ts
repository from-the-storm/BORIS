import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const stepYaml = `---
- step: message
  character: clarence
  messages:
    - Funny how music put times in perspective
    - Add a soundtrack to your life and perfect it.
`;
const getStep = () => MockGameManager.loadStepFromYaml(stepYaml);

const MESSAGE_DELAY = 1000;

describe("Message Step tests", () => {

    it("returns a null UI state at first, then the messages appear one by one over time", async () => {
        const step = getStep();
        const runPromise = step.run();

        expect(step.getUiState()).toEqual(null);
        expect(step.isComplete).toBe(false);

        // Jest timer mocking isn't working with the asynchronous nature of run()
        // so we have to delay this test case in real time :/
        await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY + 150));

        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.MessageStep,
            character: "clarence",
            messages: [
                "Funny how music put times in perspective",
            ],
        });
        expect(step.isComplete).toBe(false);

        await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY + 150));

        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.MessageStep,
            character: "clarence",
            messages: [
                "Funny how music put times in perspective",
                "Add a soundtrack to your life and perfect it.",
            ],
        });
        expect(step.isComplete).toBe(true);
    });

});
