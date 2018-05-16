import * as React from 'react';
import * as ReactDOM from 'react-dom';
import createHistory from 'history/createBrowserHistory';
import { Admin, Resource } from 'react-admin';

import { dataProvider } from './data-provider';
import { UserList } from './users';
import { TeamList } from './teams';
import { ScenarioList } from './scenarios';

const history = createHistory({ basename: '/admin' });

const App = () => (
    <Admin title="Boris Admin" dataProvider={dataProvider} history={history}>
        <Resource name="users" list={UserList} />
        <Resource name="teams" list={TeamList} />
        <Resource name="scenarios" list={ScenarioList} />
    </Admin>
);

ReactDOM.render(<App />, document.getElementById('app-container'));
