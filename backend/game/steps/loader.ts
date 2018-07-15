import { GameManagerStepInterface } from "../manager";
import { Step, StepParams } from "../step";

import { MessageStep } from "./message-step";
import { FreeResponseStep } from "./free-response-step";
import { MultipleChoiceStep } from "./choice-step";
import { PauseStep } from "./pause-step";
import { GotoStep } from "./goto-step";
import { TargetStep } from "./target-step";
import { AssignRolesStep } from "./assign-roles";
import { BulletinStep } from "./bulletin";

export function loadStepFromData(data: any, id: number, manager: GameManagerStepInterface): Step {
    const {step, ...otherData} = data; // Remove the 'step' key from the data; 'step' is the step type.
    const args: StepParams = {id, manager, config: otherData};
    switch (step) {
        case 'message': return new MessageStep(args);
        case 'free response': return new FreeResponseStep(args);
        case 'choice': return new MultipleChoiceStep(args);
        case 'pause': return new PauseStep(args);
        case 'goto': return new GotoStep(args);
        case 'target': return new TargetStep(args);
        case 'bulletin': return new BulletinStep(args);
        case 'assignroles': return new AssignRolesStep(args);
        default: throw new Error(`Unable to load type with step type "${step}".`);
    }
}
