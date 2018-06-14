import { NotificationType, TeamChangedNotification, AnyNotification } from "../../common/notifications";
import { Store } from "react-redux";
import { RootState } from "../global/state";
import { OtherTeamMember } from "../../common/models";
import { AnyAction } from "../global/actions";
import { TeamStateActions } from "../global/state/team-state-actions";
import { updateStepUiState, GameStateActions, refreshGameUiState } from "../global/state/game-state-actions";


export function handleNotification(store: Store<RootState>, event: AnyNotification) {
    if (event.type === NotificationType.TEAM_CHANGED) {
        let isTeamAdmin: boolean = false;
        const otherTeamMembers: OtherTeamMember[] = [];
        for (const member of event.teamMembers) {
            if (member.id === store.getState().userState.id) {
                isTeamAdmin = member.isAdmin;
            } else {
                otherTeamMembers.push(member);
            }
        }
        store.dispatch<AnyAction>({type: TeamStateActions.TEAM_MEMBERS_CHANGED, isTeamAdmin, otherTeamMembers});
    } else if (event.type === NotificationType.GAME_UI_UPDATE) {
        if (store.getState().gameState.isActive) {
            store.dispatch(updateStepUiState(event.stepIndex, event.newStepUi, event.uiUpdateSeqId));
        }
    } else if (event.type === NotificationType.GAME_STATUS_CHANGED) {
        if (event.isActive) {
            // We are starting a game:
            store.dispatch<AnyAction>({
                type: GameStateActions.START_GAME,
                scenarioId: event.scenarioId,
                scenarioName: event.scenarioName,
            });
            store.dispatch(refreshGameUiState());
        } else {
            // We are stopping the game
            store.dispatch<AnyAction>({type: GameStateActions.ABANDON_GAME});
        }
    }
}
