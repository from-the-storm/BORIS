import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createBrowserHistory } from 'history';
import { Admin, Resource } from 'react-admin';

import { dataProvider } from './data-provider';
import { UserList, UserShow } from './users';
import { TeamList, TeamShow } from './teams';
import { ScenarioList, ScenarioShow, ScenarioEdit, ScenarioCreate } from './scenarios';
import { ScriptsList, ScriptEdit, ScriptCreate, ScriptShow } from './scripts';
import { GameList } from './games';

const history = createBrowserHistory({ basename: '/admin' });

const App = () => (
    <Admin title="Boris Admin" dataProvider={dataProvider} history={history}>
        <Resource name="users"     list={UserList}     show={UserShow} />
        <Resource name="teams"     list={TeamList}     show={TeamShow} />
        <Resource name="scenarios" list={ScenarioList} show={ScenarioShow} edit={ScenarioEdit} create={ScenarioCreate} />
        <Resource name="scripts"   list={ScriptsList}  show={ScriptShow}   edit={ScriptEdit}   create={ScriptCreate} />
        <Resource name="games"     list={GameList} />
    </Admin>
);

ReactDOM.render(<App />, document.getElementById('app-container'));
