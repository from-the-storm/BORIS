import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const stepYaml = `---
- step: pause
  for: 2
`;
const getStep = () => MockGameManager.loadStepFromYaml(stepYaml);

describe("Message Step tests", () => {

    it("is only marked as complete after the chosen delay", async () => {
        const step = getStep();
        step.run();

        expect(step.getUiState()).toEqual(null);
        expect(step.isComplete).toBe(false);

        // Jest timer mocking isn't working with the asynchronous nature of run()
        // so we have to delay this test case in real time :/
        await new Promise(resolve => setTimeout(resolve, 2000 + 150));

        expect(step.getUiState()).toEqual(null);
        expect(step.isComplete).toBe(true);
    });

});
