import { NotificationType, TeamChangedNotification, AnyNotification } from "../../common/notifications";
import { Store } from "react-redux";
import { RootState } from "../global/state";
import { OtherTeamMember } from "../../common/models";
import { AnyAction } from "../global/actions";
import { TeamStateActions } from "../global/state/team-state-actions";
import { updateStepUiState, GameStateActions, refreshGameUiState } from "../global/state/game-state-actions";
import { MessagesStateActions } from "../global/state/messages-state-actions";


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
        if (store.getState().gameState.isActive || store.getState().gameState.isReviewingGame) {
            store.dispatch(updateStepUiState(event.stepIndex, event.newStepUi, event.uiUpdateSeqId));
        }
    } else if (event.type === NotificationType.GAME_STATUS_CHANGED) {
        store.dispatch<AnyAction>({
            type: GameStateActions.GAME_STATUS_CHANGED,
            newStatus: event,
        });
    } else if (event.type === NotificationType.MARKET_STATUS_CHANGED) {
        store.dispatch<AnyAction>({
            type: TeamStateActions.UPDATE_MARKET_DATA,
            saltinesBalance: event.saltinesBalance,
            saltinesEarnedAllTime: event.saltinesEarnedAllTime,
            marketStatus: event.status,
        })
    } else if (event.type === NotificationType.GAME_ERROR) {
        console.error("Game error:");
        console.error(event.debuggingInfoForConsole);
        store.dispatch<AnyAction>({
            type: MessagesStateActions.SHOW_ERROR,
            title: "Error",
            errorHtml: event.friendlyErrorMessage,
        });
    }
}
