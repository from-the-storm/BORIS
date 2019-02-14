import * as React from 'react';
import {
    List,
    Datagrid,
    ArrayField,
    NumberField,
    TextField,
    DateField,
    EmailField,
    ShowButton,
    ShowController,
    ShowView,
    SimpleShowLayout,
    CardActions,
    ListButton,
    RefreshButton,
    DeleteButton,
    Button,
} from 'react-admin';

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

////// Begin code to add a custom "Reset vars" button
const cardActionStyle = {
    zIndex: 2,
    display: 'inline-block',
    float: 'right',
};

async function resetTeam(teamId: number) {
    if (confirm("Are you sure you want to reset the variables (saltines, roles, etc.) for this team?")) {
        await fetch(`/api/admin/teams/${teamId}/reset-vars`, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({}),
            headers: new Headers({"Content-Type": "application/json"}),
        });
        location.reload();
    }
}

const TeamShowActions = (props: any) => (
    <CardActions style={cardActionStyle}>
        <ListButton basePath={props.basePath} />
        <RefreshButton />
        <DeleteButton basePath={props.basePath} record={props.data} resource={props.resource} />
        {/* Add your custom actions */}
        <Button color="secondary" onClick={() => { resetTeam(props.data.id); }}>Reset Vars (!)</Button>
    </CardActions>
);
////// End code to add a custom "Reset vars" button

export const TeamShow = (props: any) => (
    <ShowController {...props}>
        {(controllerProps: any) => 
            <ShowView {...props} {...controllerProps} actions={<TeamShowActions />}>
                <SimpleShowLayout>
                    <NumberField source="id" />
                    <TextField source="name" />
                    <TextField source="organization" />
                    <TextField source="code" />
                    <DateField source="created" />
                    <ArrayField source="members">
                        <Datagrid>
                            <NumberField source="user_id" />
                            <TextField source="first_name" />
                            <EmailField source="email" />
                        </Datagrid>
                    </ArrayField>
                    {controllerProps.record && controllerProps.record.game_vars && Object.keys(controllerProps.record.game_vars).map(k =>
                        <TextField key={k} source={`game_vars.${k}`} label={k} />
                    )}
                </SimpleShowLayout>
            </ShowView>
        }
    </ShowController>
);
