import * as React from 'react';
import { List, Datagrid, EmailField, NumberField, TextField, DateField } from 'react-admin';

export const TeamList = (props: any) => (
    <List title="All teams" {...props}>
        <Datagrid>
            <NumberField source="id" />
            <TextField source="name" />
            <TextField source="organization" />
            <TextField source="code" />
            <DateField source="created" />
        </Datagrid>
    </List>
);
