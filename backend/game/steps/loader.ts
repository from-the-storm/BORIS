import { GameManager } from "../manager";
import { Step, StepParams } from "../step";

import { MessageStep } from "./message-step";
import { FreeResponseStep } from "./free-response";
import { MultipleChoiceStep } from "./choice-step";

export function loadStepFromData(data: any, id: number, manager: GameManager): Step {
    const {step, ...otherData} = data; // Remove the 'step' key from the data; 'step' is the step type.
    const args: StepParams = {id, manager, settings: otherData};
    switch (step) {
        case 'message': return new MessageStep(args);
        case 'free response': return new FreeResponseStep(args);
        case 'choice': return new MultipleChoiceStep(args);
        default: throw new Error(`Unable to load type with step type "${step}".`);
    }
}
