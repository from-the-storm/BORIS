import { StepType, MapStepUiState } from "../../../common/game";
import { Step } from "../step";
import { SafeError } from "../../routes/api-utils";

export class MapStep extends Step {
    public static readonly stepType: StepType = StepType.MapStep;
    readonly settings: {
        latitude: number;
        longitude: number;
        zoomLevel: number;
        messageHTML: string;
    };

    async run() {}

    protected parseConfig(config: any): MapStep['settings'] {
        if (typeof config.lat !== 'number') {
            throw new SafeError(`Progress steps must have a numeric 'lat' parameter.`);
        }
        if (typeof config.lng !== 'number') {
            throw new SafeError(`Progress steps must have a numeric 'lng' parameter.`);
        }
        if (typeof config.zoom !== 'number') {
            throw new SafeError(`Progress steps must have a numeric 'zoom' parameter.`);
        }
        if (typeof config.message !== 'string') {
            throw new SafeError(`Progress steps must have a numeric 'message' parameter.`);
        }
        return {
            latitude: config.lat,
            longitude: config.lng,
            zoomLevel: config.zoom,
            messageHTML: config.message,
        };
    }

    getUiState(): MapStepUiState {
        return {
            type: StepType.MapStep,
            stepId: this.id,
            latitude: this.settings.latitude,
            longitude: this.settings.longitude,
            zoomLevel: this.settings.zoomLevel,
            messageHTML: this.settings.messageHTML,
        };
    }

    public get isComplete() { return true; }
}
