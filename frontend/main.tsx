import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { default as thunk } from 'redux-thunk';

import {
    RootState,
    initStateReducer,
    userStateReducer,
    teamStateReducer,
    gameStateReducer,
    messagesStateReducer,
} from './global/state';
import { registrationStateReducer } from './registration/registration-state';
import { lobbyStateReducer } from './lobby/lobby-state';
import { rpcClientStateReducer } from './rpc-client/rpc-client-state';
import {App} from './app';
import { RootLoadingSpinnerComponent } from './loading/root-loading-spinner';
import { InitStateActions } from './global/state/init-state-actions';
import { UserStateActions } from './global/state/user-state-actions';
import { InitialStateResponse, GET_INITIAL_STATE } from '../common/api';
import { TeamStateActions } from './global/state/team-state-actions';
import { callApi } from './api';
import { AnyAction } from './global/actions';
import { rpcClientMiddleware } from './rpc-client/manager';
import { Middleware } from 'redux';
import { GameStateActions, refreshGameUiState } from './global/state/game-state-actions';


export const store = createStore(
    combineReducers<RootState>({
        initState: initStateReducer,
        messagesState: messagesStateReducer,
        userState: userStateReducer,
        teamState: teamStateReducer,
        registrationState: registrationStateReducer,
        lobbyState: lobbyStateReducer,
        rpcClientState: rpcClientStateReducer,
        gameState: gameStateReducer,
    }),
    applyMiddleware(thunk, rpcClientMiddleware as Middleware),
);

const appHolderElement = document.getElementById('app-container');

const rootComponent = ReactDOM.render((
    <Provider store={ store }>
        <RootLoadingSpinnerComponent>
            <App />
        </RootLoadingSpinnerComponent>
    </Provider>
), appHolderElement);

// For webdriver tests:
declare global {
    interface Window { __rootComponent: any; }
}
window.__rootComponent =  null; // Gets set after loading initial state, below.

// Load the initial state from the server:
callApi(GET_INITIAL_STATE, {}).then(async data => {
    if (data.user) {
        store.dispatch<AnyAction>({
            type: UserStateActions.LOGIN,
            firstName: data.user.first_name,
            id: data.user.id,
        });
        if (data.team) {
            store.dispatch<AnyAction>({
                type: TeamStateActions.JOIN_TEAM,
                teamCode: data.team.code,
                teamName: data.team.name,
                isTeamAdmin: data.team.isTeamAdmin,
                otherTeamMembers: data.team.otherTeamMembers,
            });
            if (data.game) {
                store.dispatch<AnyAction>({
                    type: GameStateActions.START_GAME,
                    scenarioId: data.game.scenarioId,
                    scenarioName: data.game.scenarioName,
                });
                store.dispatch(refreshGameUiState());
            }
        }
    }
    store.dispatch<AnyAction>({type: InitStateActions.SUCCEEDED});
    window.__rootComponent = rootComponent;
}, () => {
    store.dispatch<AnyAction>({type: InitStateActions.FAILED});
});
