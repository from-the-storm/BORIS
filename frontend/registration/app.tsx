import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { default as thunk } from 'redux-thunk';

import {userStateReducer, UserState} from '../global/state/user-state';
import {LoginStatus} from './login-status';

class App extends React.PureComponent {
    public render() {
        return <div id="app" className="boris-app registration">
            Hello from React!

            <LoginStatus />
        </div>;
    }
}

export interface RootStore {
    userState: UserState;
}
export const store = createStore(
    combineReducers<RootStore>({
        userState: userStateReducer,
    }),
    applyMiddleware(thunk),
);

const appHolderElement = document.getElementById('app-container');

ReactDOM.render((
    <Provider store={ store }>
        <App />
    </Provider>
), appHolderElement);
