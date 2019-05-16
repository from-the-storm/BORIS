import { GameManagerStepInterface } from "../manager-defs";
import { Step, StepParams } from "../step";

import { MessageStep } from "./message-step";
import { FreeResponseStep } from "./free-response-step";
import { MultipleChoiceStep } from "./choice-step";
import { PauseStep } from "./pause-step";
import { GotoStep } from "./goto-step";
import { TargetStep } from "./target-step";
import { AssignRolesStep } from "./assign-roles";
import { BulletinStep } from "./bulletin";
import { AwardSaltinesStep } from "./award-saltines";
import { SetVariableStep } from "./set-step";
import { ProgressStep } from "./progress-step";
import { MapStep } from "./map-step";
import { FinishLineStep } from "./finish-line-step";

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
        case 'award': return new AwardSaltinesStep(args);
        case 'bulletin': return new BulletinStep(args);
        case 'set': return new SetVariableStep(args);
        case 'assignroles': return new AssignRolesStep(args);
        case 'progress': return new ProgressStep(args);
        case 'map': return new MapStep(args);
        case 'finish line': return new FinishLineStep(args);
        default: throw new Error(`Unable to load type with step type "${step}".`);
    }
}
