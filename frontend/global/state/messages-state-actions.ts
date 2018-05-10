//// Messages State Actions

export enum MessagesStateActions {
    // G_MS prefix means Global Messages State
    SHOW_ERROR = 'G_MS_SHOW_ERROR',
    SHOW_INFO = 'G_MS_SHOW_INFO',
    DISMISS_MESSAGE = 'G_MS_DISMISS',
}

interface ShowErrorAction {
    type: MessagesStateActions.SHOW_ERROR,
    title: string;
    errorHtml: string;
}
interface ShowInfoAction {
    type: MessagesStateActions.SHOW_INFO,
    title: string;
    infoHtml: string;
}
interface DismissMessageAction {
    type: MessagesStateActions.DISMISS_MESSAGE,
}

export type MessagesStateActionsType = ShowErrorAction|ShowInfoAction|DismissMessageAction;
