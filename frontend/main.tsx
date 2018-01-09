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
} from './global/state';
import {RegistrationState, registrationStateReducer} from './registration/registration-state';
import {App} from './app';
import { LoadingSpinnerComponent } from './loading/loading-spinner';
import { InitStateActions } from './global/state/init-state-actions';
import { UserStateActions } from './global/state/user-state-actions';


export const store = createStore(
    combineReducers<RootState>({
        initState: initStateReducer,
        userState: userStateReducer,
        teamState: teamStateReducer,
        registrationState: registrationStateReducer,
    }),
    applyMiddleware(thunk),
);

const appHolderElement = document.getElementById('app-container');

const rootComponent = ReactDOM.render((
    <Provider store={ store }>
        <LoadingSpinnerComponent>
            <App />
        </LoadingSpinnerComponent>
    </Provider>
), appHolderElement);

// For webdriver tests:
declare global {
    interface Window { __rootComponent: any; }
}
window.__rootComponent =  null; // Gets set after loading initial state, below.

// Load the initial state from the server:
fetch('/app-api/get-initial-state', {
    method: 'post',
    credentials: 'include',
}).then(async response => {
    if (response.ok) {
        const data = await response.json();
        if (data.user) {
            store.dispatch({
                type: UserStateActions.LOGIN,
                firstName: data.user.first_name,
            });
        }
        store.dispatch({type: InitStateActions.SUCCEEDED});
        window.__rootComponent = rootComponent;
    } else {
        store.dispatch({type: InitStateActions.FAILED});
    }
});
