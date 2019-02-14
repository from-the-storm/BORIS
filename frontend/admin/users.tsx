import * as React from 'react';
import { List, Datagrid, BooleanField, EmailField, TextField, DateField, NumberField, Show, ShowButton, SimpleShowLayout } from 'react-admin';

export const UserList = (props: any) => (
    <List title="All users" {...props}>
        <Datagrid>
            <TextField source="id" />
            <TextField source="first_name" />
            <EmailField source="email" />
            <DateField source="created" />
            <ShowButton />
        </Datagrid>
    </List>
);

export const UserShow = (props: any) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="first_name" />
            <EmailField source="email" />
            <DateField source="created" />
            <NumberField label="Age" source="survey_data.age" />
            <TextField label="Occupation" source="survey_data.occupation" />
            <TextField label="Gender" source="survey_data.gender" />
            <BooleanField label="Works in Tech" source="survey_data.workInTech" />
            <BooleanField label="Consented to terms" source="survey_data.hasConsented" />
        </SimpleShowLayout>
    </Show>
);
