import * as React from 'react';
import { List, Datagrid, NumberField, TextField, DateField, ShowButton, ShowController, ShowView, SimpleShowLayout } from 'react-admin';

export const TeamList = (props: any) => (
    <List title="All teams" {...props}>
        <Datagrid>
            <NumberField source="id" />
            <TextField source="name" />
            <TextField source="organization" />
            <TextField source="code" />
            <DateField source="created" />
            <ShowButton />
        </Datagrid>
    </List>
);

export const TeamShow = (props: any) => (
    <ShowController {...props}>
        {(controllerProps: any) => 
            <ShowView {...props} {...controllerProps}>
                <SimpleShowLayout>
                    <NumberField source="id" />
                    <TextField source="name" />
                    <TextField source="organization" />
                    <TextField source="code" />
                    <DateField source="created" />
                    {controllerProps.record && controllerProps.record.game_vars && Object.keys(controllerProps.record.game_vars).map(k =>
                        <TextField key={k} source={`game_vars.${k}`} label={k} />
                    )}
                </SimpleShowLayout>
            </ShowView>
        }
    </ShowController>
);
