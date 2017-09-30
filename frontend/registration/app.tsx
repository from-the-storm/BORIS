import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { default as thunk } from 'redux-thunk';

class App extends React.Component {
    public render() {
        return <div id="app" className="boris-app registration">
            Hello from React!
        </div>;
    }
}

export interface RootStore {
    messages: {};
}
export const store = createStore(
    combineReducers<RootStore>({
        //messages: modalMessagesReducer,
    }),
    applyMiddleware(thunk),
);

const appHolderElement = document.getElementById('app-container');

ReactDOM.render((
    <Provider store={ store }>
        <App />
    </Provider>
), appHolderElement);
