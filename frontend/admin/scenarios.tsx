import * as React from 'react';
import { List, Datagrid, NumberField, TextField } from 'react-admin';

export const ScenarioList = (props: any) => (
    <List title="All teams" {...props}>
        <Datagrid>
            <NumberField source="id" />
            <TextField source="name" />
            <NumberField source="duration_min" />            
            <TextField source="difficulty" />
            <TextField source="start_point_name" />
        </Datagrid>
    </List>
);
