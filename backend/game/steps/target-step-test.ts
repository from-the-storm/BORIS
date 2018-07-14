import 'jest';
import { MockGameManager } from '../../test-lib/mock-game-manager';

const ifYaml = `---
- step: target
  name: tribble
  if: true
`;
const stepYaml = `---
- step: target
  name: tribble
`;
const getStep = () => MockGameManager.loadStepFromYaml(stepYaml);

describe("Target Step tests", () => {

    it("it can be expressed in a YAML script and it is always considered complete.", async () => {
        const step = getStep();
        step.run();

        expect(step.getUiState()).toEqual(null);
        expect(step.isComplete).toBe(true);
    });

    it("does not allow 'if' conditions", async () => {
        expect(() => { MockGameManager.loadStepFromYaml(ifYaml); }).toThrowError("A target step cannot have an 'if' condition.");
    });

});
