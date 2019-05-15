import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const stepYaml = `---
- step: progress
  percent: 42
  message: You have completed <strong>42%</strong>.
`;

describe("Progress Step tests", () => {

    it("Can display a progress message to the user", async () => {
        const step = MockGameManager.loadStepFromYaml(stepYaml);
        const runPromise = step.run();
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.ProgressStep,
            percentage: 42,
            messageHTML: 'You have completed <strong>42%</strong>.',
        });
        expect(step.isComplete).toBe(true);
        await runPromise;
    });

});
