import * as React from 'react';
import { List, Datagrid, NumberField, TextField, DateField, BooleanField } from 'react-admin';

export const GameList = (props: any) => (
    <List title="All Games" {...props}>
        <Datagrid>
            <NumberField source="id" />
            <NumberField source="team_id" />
            <NumberField source="scenario_id" />
            <DateField source="started" />
            <BooleanField source="is_active" />
        </Datagrid>
    </List>
);
