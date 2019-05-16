import * as React from 'react';
import { List, Datagrid, TextField, EditButton, Edit, Create, Show, ShowButton, SimpleShowLayout, SimpleForm, TextInput, LongTextInput } from 'react-admin';

export const ScriptsList = (props: any) => (
    <List title="All Scripts" {...props}>
        <Datagrid>
            <TextField source="name" />
            <ShowButton />
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

export const ScriptShow = (props: any) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="name" />
            <TextField source="script_yaml" />
        </SimpleShowLayout>
    </Show>
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
            <p>BORIS scripts are written in <a href="https://en.wikipedia.org/wiki/YAML">YAML</a>, and consist of a list of "steps", conditionals, and/or includes.</p>
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
                    <p>A JavaScript expression that determines whether or not any given player should see this step.</p>
                    <p>Script variables can be accessed using the <code>VAR(name, [optional default])</code> function.</p>
                    <p>You can use the <code>ROLE(roleId)</code> function to check if the current user has been assigned a particular role.</p>
                    <p>You can use the <code>NUM_PLAYERS</code> variable to get the number of players.</p>
                    <p>You can use the <code>ELAPSED_MINUTES()</code> function to get the number of minutes that the scenario took / has taken so far.</p>
                    <p>You can use the <code>USER_INFO()</code> function to get the current user's info including their answers to the registration survey.</p>
                    <p>You can use the <code>NAME_WITH_ROLE(roleId)</code> function to get the first name of the player with the given role.</p>
                    <p>Examples:</p>
                    <p><code>if: ROLE('D')</code> (only send this step to the user who is the doomsayer)</p>
                    <p><code>if: VAR('saltines', 0) >= 10</code> (only display this step if the team has earned at least ten saltines).</p>
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

            <h2>Conditionals</h2>
            <p>To make writing scripts easier, scripts can include <code>if: then:</code>, <code>elif: then:</code>, and <code>else: then:</code> directives.</p>
            <p>
                These are self-explanatory. The <code>if</code> must be first, followed by zero or more <code>elif</code> directives, and finally an optional <code>else</code> directive.
                Each directive must have the <code>then:</code> keyword followed by an indented list of steps to follow when the condition is true.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- if: VAR('name').toLowerCase() === "bob"
  then:
  - step: message
    messages:
    - You think he is Bob.
- elif: VAR('name').toLowerCase() === "carl"
  then:
  - step: message
    messages:
    - You think he is Carl.
- else:
  then:
  - step: message
    messages:
    - You are way off.
`.trim()}</pre></code>

            <h2>Message Step</h2>
            <p>
                A message step displays one or more messages from one of the characters in the game. There is a slight
                pause before each message.
            </p>
            <p>
                The character is optional and defaults to <code>boris</code>.
                It can also be set to <code>backfeed</code>, <code>clarence</code>, or <code>nameless</code> (for the nameless organization).
            </p>
            <p>
                A message can also optionally contain a JavaScript expression, if you surround it with <code>['</code> and <code>']</code>.
                If doing this, check your work using a YAML editor, because it's easy to get the syntax wrong.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: message
  character: backfeed
  messages:
  - Let’s begin the scenario.
  - First, walk to the ocean.
  - Then, yell at the moon.
  - ['"You have played this scenario " + VAR("num_times_played", 0) + " times"']
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
  messages:
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
            <p>
                A free response can optionally have a <code>allowed:</code> parameter, which is a list of allowed responses.
                The user will be prompted to enter a response over and over until they enter one of the allowed responses.
            </p>
            <h3>Example:</h3>
            <p>Ask the team for a code word:</p>
            <code><pre>{`
- step: message
  messages:
  - What's your team's code word?
- step: free response
  key: teamname
`.trim()}</pre></code>
            <h3>Example:</h3>
            <p>Ask the team for a password:</p>
            <code><pre>{`
- step: message
  messages:
  - What's the password?
- step: free response
  key: password
  allowed:
    - opensesame
`.trim()}</pre></code>


            <h2>Target Step</h2>
            <p>
                A target step labels a place in the script, so that user(s) can be sent to
                that part of the script later using a "goto" step.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: target
  name: end
`.trim()}</pre></code>


            <h2>Goto Step</h2>
            <p>
                A goto step jumps ahead to the "target" step with the specified name.
                It can only jump forward in the script, not backward.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: goto
  name: end
  if: ROLE('D')
`.trim()}</pre></code>


            <h2>Award Saltines Step</h2>
            <p>
                This step can award saltines to the team. You must specify how
                many were earned, and how many could have been earned.
                If you are using if conditions, you should include an 'award'
                step in each possible branch of the script, even if it's
                awarding 0 saltines, to ensure the total possible count is
                correct.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- if: VAR('wantsSaltines') === 'yes'
  then:
  - step: message
    messages:
    - Ok, awarding you 3 saltines
  - step: award
    earned: 3
    possible: 3
- else:
  then:
  - step: message
    messages:
    - Ok, awarding you 0 saltines
  - step: award
    earned: 0
    possible: 3
`.trim()}</pre></code>

            <h2>Set Variable Step</h2>
            <p>
                A set variable step lets you set a variable. You must specify the scope of the variable, which is either
                "game" or "team" (the difference is that team variables last across multiple games/scenarios, and "game"
                variables are only available within the current game/scenario). The "key" paramter is the name of the
                variable to set, and the "to" parameter specifies the value as a JavaScript expression.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: message
  messages:
  - ['"You have played this scenario " + VAR("num_times_played", 0) + " times"']
# Increase the number of times played by 1:
- step: set
  scope: team
  key: num_times_played
  to: VAR('num_times_played', 0) + 1
`.trim()}</pre></code>

            <h2>Pause Step</h2>
            <p>
                A pause step pauses for the specified number of seconds.
            </p>
            <h3>Example - pauses for 3 seconds:</h3>
            <code><pre>{`
- step: pause
  for: 3
`.trim()}</pre></code>

            <h2>Bulletin Step</h2>
            <p>
                A bulletin step displays a bulletin.
            </p>
            <h3>Example:</h3>
            <code><pre>{`
- step: bulletin
  html: |
    <p>Greetings from Citizens for a Friendlier Post-Apocalypse.</p>
    <p>Your training starts now, and will be delivered by BORIS.</p>
`.trim()}</pre></code>

            <h2>Progress Step</h2>
            <p>
                Shows a progress bar displaying the user's progress toward a goal.
            </p>
            <h3>Example:</h3>
<code><pre>{`
- step: progress
  percent: 38
  message: You're <strong>38%</strong> of the way to the hidden reservoir!
`.trim()}</pre></code>

            <h2>Map Step</h2>
            <p>
                Shows a map displaying where the user should be.
            </p>
            <h3>Example:</h3>
<code><pre>{`
- step: map
  message: You should be here.
  lat: 49.273164
  lng: -123.102509
  zoom: 16
`.trim()}</pre></code>

            <h2>Assign Roles Step</h2>
            <p>
                If a script is going to use the roles, it should have <code>- step: assignroles</code> as early as
                possible. This step will assign/re-assign roles as needed. It is invisible to the users and doesn't
                take any parameters.
            </p>

            <h2>Finish Line Step</h2>
            <p>
                If you want to have an optional post-game experience, use <code>- step: finish line</code> to mark
                the end of the game. Any steps that come after that will be considered optional. Note that you
                cannot save any team variables after the finish line has been passeed. The finish line step does
                not take any parameters and should never have any 'if' conditions nor be marked as 'parallel'.
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
