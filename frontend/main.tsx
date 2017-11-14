import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { default as thunk } from 'redux-thunk';

import {
    RootState,
    userStateReducer,
    UserState,
    teamStateReducer,
    TeamState
} from './global/state';
import {RegistrationState, registrationStateReducer} from './registration/registration-state';
import {App} from './app';


export const store = createStore(
    combineReducers<RootState>({
        userState: userStateReducer,
        teamState: teamStateReducer,
        registrationState: registrationStateReducer,
    }),
    applyMiddleware(thunk),
);

const appHolderElement = document.getElementById('app-container');

ReactDOM.render((
    <Provider store={ store }>
        <App />
    </Provider>
), appHolderElement);
