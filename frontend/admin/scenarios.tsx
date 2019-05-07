import * as React from 'react';
import {
    List,
    Datagrid,
    NumberField,
    TextField,
    BooleanField,
    ShowButton,
    Show,
    SimpleShowLayout,
    EditButton,
    Edit,
    Create,
    SimpleForm,
    TextInput,
    LongTextInput,
    NumberInput,
    ReferenceInput,
    SelectInput,
    BooleanInput,
} from 'react-admin';

export const ScenarioList = (props: any) => (
    <List title="All Scenarios" {...props}>
        <Datagrid>
            <TextField source="name" />
            <TextField source="script" />
            <TextField source="start_point_name" />
            <BooleanField source="is_active" />
            <NumberField source="duration_min" />
            <TextField source="difficulty" />
            <TextField source="city" />
            <NumberField source="order" />
            <ShowButton />
            <EditButton />
        </Datagrid>
    </List>
);

export const ScenarioShow = (props: any) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="name" />
            <TextField source="script" />
            <TextField source="start_point_name" />
            <NumberField source="start_point.lat" />
            <NumberField source="start_point.lng" />
            <TextField source="description_html" />
            <BooleanField source="is_active" />
            <NumberField source="duration_min" />
            <TextField source="difficulty" />
            <TextField source="city" />
            <NumberField source="order" />
        </SimpleShowLayout>
    </Show>
);

const editForm = <SimpleForm redirect={false}>
    <TextInput source="name" />
    <ReferenceInput label="Script" source="script" reference="scripts">
        <SelectInput optionText="name" />
    </ReferenceInput>
    <TextInput source="start_point_name" />
    <NumberInput source="start_point.lat" />
    <NumberInput source="start_point.lng" />
    <LongTextInput source="description_html" />
    <BooleanInput source="is_active" />
    <NumberInput source="duration_min" />
    <SelectInput source="difficulty" choices={[
        { id: 'easy', name: 'easy' },
        { id: 'med', name: 'med' },
        { id: 'hard', name: 'hard' },
    ]} />
    <SelectInput source="city" choices={[
        { id: 'vancouver', name: 'vancouver' },
        { id: 'kelowna', name: 'kelowna' },
        { id: 'hidden', name: 'hidden' },
    ]} />
    <NumberInput source="order" />
</SimpleForm>;

export const ScenarioEdit = (props: any) => (
    <Edit {...props} undoable={false}>
        {editForm}
    </Edit>
);

export const ScenarioCreate = (props: any) => (
    <Create {...props} undoable={false}>
        {editForm}
    </Create>
);
