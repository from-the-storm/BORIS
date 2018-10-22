import * as React from 'react';
import { List, Datagrid, NumberField, DateField, BooleanField, Filter, SelectInput } from 'react-admin';

const GamesFilter = (props: any) => (
    <Filter {...props}>
        <SelectInput source="statusFilter" alwaysOn choices={[
            { id: 'active', name: 'Active' },
            { id: 'completed', name: 'Completed' },
            { id: 'abandoned', name: 'Abandoned' },
        ]} />
    </Filter>
);

export const GameList = (props: any) => (
    <List title="All Games" filters={<GamesFilter />} {...props}>
        <Datagrid>
            <NumberField source="id" />
            <NumberField source="team_id" />
            <NumberField source="scenario_id" />
            <DateField source="started" />
            <BooleanField source="is_active" />
        </Datagrid>
    </List>
);
