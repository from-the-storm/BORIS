import * as React from 'react';
import { List, Datagrid, TextField, EditButton, Edit, Create, SimpleForm, TextInput, LongTextInput } from 'react-admin';

export const ScriptsList = (props: any) => (
    <List title="All Scripts" {...props}>
        <Datagrid>
            <TextField source="name" />
            <EditButton />
        </Datagrid>
    </List>
);

export const ScriptCreate = (props: any) => (
    <div>
        <Create title={"Create Script"} undoable={false} {...props}>
            <SimpleForm>
                <TextInput source="name" />
                <LongTextInput source="script_yaml" defaultValue={"---\n- step: message\n  messages:\n  - Hello from BORIS!"} />
            </SimpleForm>
        </Create>
        <DocumentationAndStyles/>
    </div>
);


export const ScriptEdit = (props: any) => (
    <div>
        <Edit title={"Edit Script"} undoable={false} {...props}>
            <SimpleForm redirect={false}>
                <TextField source="name" />
                <LongTextInput source="script_yaml" />
            </SimpleForm>
        </Edit>
        <DocumentationAndStyles/>
    </div>
);

export const DocumentationAndStyles = (props: {}) => (
    <>
        {/* hackity hack hack - to replace with https://github.com/marmelab/react-admin/blob/b9ab8fce7d519250a4adcb3e3edac9d48750a0ff/UPGRADE.md#customizing-styles */}
        <style>{`
            textarea {
                font-family: monospace !important;
            }
        `}</style>

        <div>
            <h1>Documentation</h1>
        </div>
    </>
);
