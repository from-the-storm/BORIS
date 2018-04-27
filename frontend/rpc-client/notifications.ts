import { NotificationType, TeamChangedNotification } from "../../common/notifications";
import { Store } from "react-redux";
import { RootState } from "../global/state";
import { OtherTeamMember } from "../../common/models";
import { AnyAction } from "../global/actions";
import { TeamStateActions } from "../global/state/team-state-actions";


export function handleNotification(store: Store<RootState>, type: NotificationType, data: any) {
    if (type === NotificationType.TEAM_CHANGED) {
        let isTeamAdmin: boolean = false;
        const otherTeamMembers: OtherTeamMember[] = [];
        const event: TeamChangedNotification = data;
        for (const member of event.teamMembers) {
            if (member.id === store.getState().userState.id) {
                isTeamAdmin = member.isAdmin;
            } else {
                otherTeamMembers.push(member);
            }
        }
        store.dispatch<AnyAction>({type: TeamStateActions.TEAM_MEMBERS_CHANGED, isTeamAdmin, otherTeamMembers});
    }
}
