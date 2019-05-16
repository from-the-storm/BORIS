import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';
import { StepType } from '../../../common/game';

const stepYaml = `---
- step: map
  message: You should be here
  lat: 49.273164
  lng: -123.102509
  zoom: 16
`;

describe("Map Step tests", () => {

    it("Can display a map and message to the user", async () => {
        const step = MockGameManager.loadStepFromYaml(stepYaml);
        const runPromise = step.run();
        expect(step.getUiState()).toEqual({
            stepId: 1,
            type: StepType.MapStep,
            latitude: 49.273164,
            longitude: -123.102509,
            zoomLevel: 16,
            messageHTML: "You should be here",
        });
        expect(step.isComplete).toBe(true);
        await runPromise;
    });

});
