import * as React from 'react';
import { List, Datagrid, EmailField, TextField } from 'react-admin';

export const UserList = (props: any) => (
    <List title="All users" {...props}>
        <Datagrid>
            <TextField source="id" />
            <TextField source="first_name" />
            <EmailField source="email" />
        </Datagrid>
    </List>
);
