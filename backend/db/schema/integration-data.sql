INSERT INTO scripts (name, script_yaml) VALUES
------------------------------------------------------------------------------------------------------------------------------------------------------
('integration-story1-1', $$---
# Always re-assign roles, even if this team has played previous scenarios
- step: assignroles

# Skip this storyline if the team has done it before:
- step: goto
  name: end-of-story1-1
  if: VAR('seen-story1-1', false)

- step: message
  messages:
    - "(Waiting on your teammate.)"
  if: "!ROLE('D')"
  parallel: yes

- step: bulletin
  if: ROLE('D')
  html: |
    <p>Please read aloud: Greetings! Are you ready to have your roles assigned via personality testing?</p>

- step: choice
  key: d-donegreeting
  choices:
    - x: Done
  if: ROLE('D')

- step: message
  messages:
    - "What do you choose?"

### Four players ###################################################################################

- if: NUM_PLAYERS === 4
  then:
  - step: choice
    key: personality1-4p
    if: ROLE('W')
    parallel: yes
    choices:
      - a: Avogadro
      - b: Bacon
      - c: Certainty
      - d: Dominoes
  - step: choice
    key: personality2-4p
    if: ROLE('S')
    parallel: yes
    choices:
      - a: Aptitude
      - b: Bazzar
      - c: Caffeine
      - d: Donut
  - step: choice
    key: personality3-4p
    if: ROLE('I')
    parallel: yes
    choices:
      - a: Apple
      - b: Banana
      - c: Cherry
      - d: Date
  - step: choice
    key: personality4-4p
    if: ROLE('B') && ROLE('D')
    parallel: yes
    choices:
      - a: Antwerp
      - b: Berlin
      - c: Caracas
      - d: Durban

  - step: message
    if: ROLE('W')
    parallel: yes
    messages:
      - You will be the WAYFINDER.
  - step: message
    if: ROLE('S')
    parallel: yes
    messages:
      - You will be the SCIENTICIAN.
  - step: message
    if: ROLE('I')
    parallel: yes
    messages:
      - You will be the INTERPRETER.
  - step: message
    if: ROLE('B') && ROLE('D')
    parallel: yes
    messages:
      - You will be the BURDENED DOOMSAYER. 

### Two players ####################################################################################

- elif: NUM_PLAYERS === 2
  then:
  - step: choice
    key: personality1-2p
    if: ROLE('B') && ROLE('D') && ROLE('S')
    parallel: yes
    choices:
      - a: Avogadro
      - b: Bacon
      - c: Certainty
      - d: Dominoes
  
  - step: choice
    key: personality2-2p
    if: ROLE('I') && ROLE('W')
    parallel: yes
    choices:
      - a: Aptitude
      - b: Bazzar
      - c: Caffeine
      - d: Donut
  
  - step: message
    if: ROLE('B') && ROLE('D') && ROLE('S')
    parallel: yes
    messages:
      - You will be the BURDENED, DOOMSAYING SCIENTICIAN.
  
  - step: message
    if: ROLE('I') && ROLE('W')
    parallel: yes
    messages:
      - You will be the INTERPRETIVE WAYFINDER.

####################################################################################################

- step: message
  messages:
    - Please audibly share your role with your team. 

#######  End of snippet ########

- step: target
  name: end-of-story1-1

- step: message
  messages:
    - Hello, BORIS speaking. On behalf of the Citizens, welcome back.

- if: VAR('seen-story1-1')
  then:
  - step: message
    messages:
      - Roles shuffled! You have been assigned a new role.

- step: set
  scope: team
  key: seen-story1-1
  to: "true"

$$),



















------------------------------------------------------------------------------------------------------------------------------------------------------
('integration-script', $$---
- include: integration-story1-1

# A challenge for the wayfinder, with hints that appear to other team members.

- step: message
  if: ROLE('W')
  messages:
    - Your challenge is to find the Map of Truth.

- step: pause
  for: 0 ##### This step is not parallel, so it blocks the rest of the team from seeing the parallel steps below until everyone is at this point.


- step: message
  if: ROLE('W')
  messages:
    - Let’s begin. Your first task of wayfinding is to find a large map.
    - Once you do, guide your team over to it and let us know.

- step: pause
  for: 0 ##### This step is not parallel, so it blocks the rest of the team from seeing the parallel steps below until everyone is at this point.

- step: choice
  if: ROLE('W')
  parallel: yes
  key: found-map
  choices:
    - x: Found it

- step: pause
  if: VAR('found-map', 'not found yet') === 'not found yet'
  parallel: yes
  for: 5

- step: message
  if: ROLE('B') && VAR('where-are-you', 'not chosen yet') === 'not chosen yet'
  parallel: yes
  messages:
    - "Here's a hint for the Burdened: the map doesn't exist."

- step: message
  if: ROLE('W')
  messages:
    - So you're all in front of the map?
    - "Prove you found the map by answering: What color is the \"Secret Building\"?"

- step: choice
  if: ROLE('W')
  key: where-are-you
  correct: here
  choices:
    - red: Red
    - blue: Blue
    - white: White
    - black: Black

$$),
------------------------------------------------------------------------------------------------------------------------------------------------------
('integration-scenario-ender', $$---

$$);
------------------------------------------------------------------------------------------------------------------------------------------------------
INSERT INTO scenarios (id, name, script, duration_min, difficulty, start_point_name, start_point, description_html) VALUES 
    (100, 'Integration Scenario', 'integration-script', 30, 'med', 'Worldwide', '(49.273373, -123.102657)', '<p>This scenario has a script very similar to real scenarios.</p>')
;
