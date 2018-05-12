import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Admin, Resource } from 'react-admin';
import { dataProvider } from './data-provider';
import { UserList } from './users';

import createHistory from 'history/createBrowserHistory';

const history = createHistory({ basename: '/admin' });

const App = () => (
    <Admin title="Boris Admin" dataProvider={dataProvider} history={history}>
        <Resource name="users" list={UserList} />
    </Admin>
);

ReactDOM.render(<App />, document.getElementById('app-container'));
