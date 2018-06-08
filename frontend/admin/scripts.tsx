import * as React from 'react';
import { List, Datagrid, NumberField, TextField } from 'react-admin';

export const ScriptList = (props: any) => (
    <List title="All Scripts" {...props}>
        <Datagrid>
            <NumberField source="id" />
            <TextField source="name" />
            <TextField source="description" />
        </Datagrid>
    </List>
);
