import * as React from 'react';
import { List, Datagrid, NumberField, DateField, BooleanField, ReferenceField, TextField, Filter, SelectInput } from 'react-admin';

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
            <ReferenceField label="Team" source="team_id" reference="teams" linkType="show">
                <TextField source="name" />
            </ReferenceField>
            <ReferenceField label="Scenario" source="scenario_id" reference="scenarios" linkType="show">
                <TextField source="name" />
            </ReferenceField>
            <TextField source="time_taken" />
            <DateField source="started" />
            <BooleanField source="is_active" />
        </Datagrid>
    </List>
);
