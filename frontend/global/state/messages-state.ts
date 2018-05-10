import {Record, Stack} from 'immutable';
import { AnyAction } from '../actions';
import { MessagesStateActions } from './messages-state-actions';

export enum MessageType {
    INFO,
    ERROR,
}


export interface Message {
    readonly type: MessageType;
    readonly html: string;
    readonly title: string;
}

/**
 * Global state for generic error/info message popups
 */
export class MessagesState extends Record({
    messages: Stack<Message>(),
}) {
    // ...
    get hasMessage() { return this.currentMessage !== undefined; }
    get currentMessage(): Message|undefined {
        return this.messages.first();
    }
}

/**
 * Reducer that maintains the state of the app's popup error/info messages
 */
export function messagesStateReducer(state?: MessagesState, action?: AnyAction): MessagesState {

    if (state === undefined) {
        return new MessagesState();
    }

    switch (action.type) {
    case MessagesStateActions.SHOW_ERROR:
        return state.set('messages', state.messages.unshift({
            type: MessageType.ERROR,
            html: action.errorHtml,
            title: action.title,
    }));
    case MessagesStateActions.SHOW_INFO:
        return state.set('messages', state.messages.unshift({
            type: MessageType.INFO,
            html: action.infoHtml,
            title: action.title,
        }));
    case MessagesStateActions.DISMISS_MESSAGE:
        return state.set('messages', state.messages.shift());
    default:
        return state;
    }
}
