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

        <div style={{fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'}}>
            <h1>Documentation</h1>
            <p>BORIS scripts are written in <a href="https://en.wikipedia.org/wiki/YAML">YAML</a>, and consist of a list of "steps", and/or includes.</p>
            <h2>Steps</h2>
            <p>A typical step looks like:</p>
            <code><pre>{`
- step: message
  if: ROLE('D')
  messages:
  - Remember that in order to help your team, you should always share the information you receive out loud.
`}</pre></code>
            <p>Every step starts with <code>- step: <em>(step type)</em></code> where (step type) is one of the types listed below.</p>
            <h2>Step Parameters</h2>
            <p>Some types of step take parameters (like <code>messages:</code> for the <code>message</code> step), and there are some parameters that all steps take:</p>
            <dl>
                <dt><code>if: <em>(condition)</em></code></dt>
                <dd>
                    <p>A JavaScript expression that determines whether or not any given player should see this step.
                    Script variables can be accessed using the <code>VAR(name)</code> function.
                    You can use the <code>ROLE(roleId)</code> function to check if the current user has been assigned a particular role.</p>
                    <p>Examples:</p>
                    <p><code>if: ROLE('D')</code> (only send this step to the user who is the doomsayer)</p>
                    <p><code>if: VAR('saltines') >= 10</code> (only display this step if the team has earned at least ten saltines).</p>
                </dd>
                <dt><code>parallel: yes</code></dt>
                <dd>
                    <p>
                        Most steps are not "parallel", which means that most steps will be held back until everyone on the team has
                        "caught up" to that step. So if some step is shown only to one user, and is waiting for a response from that
                        one user, the rest of the team won't see any new steps in the script until that one user completes the step.
                        However, if a step is marked as <code>parallel: yes</code>, then users can see that step even if others on
                        the team haven't yet finished all the earlier steps. This is useful anytime that the scripts involves
                        multiple people doing things simultaneously.
                    </p>
                </dd>
            </dl>
            <h2>Includes</h2>
            <p>A script can include other scripts, combining multiple scripts into one larger script. For example:</p>
            <code><pre>- include: story1-1</pre></code>
            <p>Includes are not steps so cannot have an <code>if</code> condition or any other parameters.</p>

            <h2>Message Step</h2>
            <p>
                A message step displays one or more messages from one of the characters in the game. There is a slight
                pause before each message.
            </p>
            <p>
                The character is optional and defaults to <code>boris</code>.
                It can also be set to <code>backfeed</code> or <code>clarence</code>
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: message
  character: backfeed
  messages:
  - Let’s begin the scenario.
  - First, walk to the ocean.
  - Then, yell at the moon.
`}</pre></code>

            <h2>[Multiple] Choice Step</h2>
            <p>
                A choice step requires the user(s) to select from one or more options. It has two modes: either it
                treats all choices as correct (there is no right answer, or it has only one correct answer, and
                once the user has chosen, it will indicate whether or not the user made the right choice.
            </p>
            <p>
                In either case, each choice step must have a list of <code>choices</code>, which each have a value and
                a description. The value is not shown to users, and should be a short word/number with no spaces.
            </p>
            <p>
                Every choice step requires a "<code><strong>key</strong></code>" parameter, which stores the name of a
                variable that will hold the team's answer. Make it unique, or else the user's response to one question
                will also be used as their response to any other question with the same <code>key</code>. You can later
                use the results of the user's choice in <code>if: </code> conditions using &nbsp;
                <code>VAR('<em>(key)</em>')</code>.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: message
  messages:
  - Can BORIS be hacked?
- step: choice
  key: canbehacked
  correct: no
  choices:
  - yes: Yes
  - no: No
- step: message
  if: VAR('canbehacked') === 'yes'
  message:
  - Actually, no. BORIS is so advanced it cannot b$@^$#% UNAUTHORIZED CODE ALTERATION
`}</pre></code>
            <h3>"Done" example:</h3>
            <p>A common use for the choice step is to pause the script until the user has completed some action:</p>
            <code><pre>{`
- step: choice
  key: donethething
  choices:
  - x: Done
`}</pre></code>

            <h2>Free Response Step</h2>
            <p>
                A free response step asks the user to input some text, and saves their input to a variable.
            </p>
            <p>
                Every free response step requires a "<code><strong>key</strong></code>" parameter, which stores the name
                of the variable that will hold the team's answer. Make it unique, or else the user's response to one
                question will also be used as their response to any other question with the same <code>key</code>. You
                can later use the results of the user's choice in <code>if: </code> conditions using &nbsp;
                <code>VAR('<em>(key)</em>')</code>.
            </p>
            <h3>Eample:</h3>
            <p>A common use for the choice step is to pause the script until the user has completed some action:</p>
            <code><pre>{`
- step: message
  messages:
  - What's your team's code word?
- step: free response
  key: teamname
`}</pre></code>

            <h2>Assign Roles Step</h2>
            <p>
                If a script is going to use the roles, it should have <code>- step: assignroles</code> as early as
                possible. This step will assign/re-assign roles as needed. It is invisible to the users and doesn't
                take any parameters.
            </p>

            <h2>Common Issues</h2>
            <p>If a message (or any parameter) has a colon (<code>:</code>) in it, the message must be in quotes:</p>
            <code><pre>{`
- step: message
  messages:
  - "Enter your name:"
`}</pre></code>
        </div>
    </>
);
