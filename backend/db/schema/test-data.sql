INSERT INTO scripts (name, script_yaml) VALUES

('test-script', '---
- step: message
  messages:
  - Hello! This is a test.
- include: test-script2
'),

('test-script2', '---
- step: choice
  key: chooseXtoEndGame
  choices:
    - x: Done
'),

('test-roles-script', '---
- step: assignroles
- step: message
  messages:
    - "This should always be the first message. Sent to all but Doomsayer"
  if: "!ROLE(''D'')"
  parallel: yes
- step: message
  messages:
    - "This is sent to the Doomsayer only."
  if: ROLE(''D'')
# Then the script should pause until the Doomsayer chooses "done":
- step: choice
  key: d-donegreeting
  choices:
    - x: Done
  if: ROLE(''D'')
- step: message
  messages:
    - "This is sent to everyone"
'),

('test-goto-script', '---
- step: assignroles
# Send the Doomsayer to the "dsmessage" target
- step: goto
  name: dsmessage
  if: ROLE(''D'')
- step: message
  messages:
    - The non-doomsayers should see this message
- step: goto
  name: end
- step: target
  name: dsmessage
- step: message
  messages:
    - This is sent to the doomsayer
- step: target
  name: end
'),

('test-saltines-script', '---
- step: award
  earned: 5
  possible: 10
- step: choice
  key: chooseXtoContinue
  choices:
    - x: Done
- step: award
  earned: 6
  possible: 6
- step: choice
  key: chooseXtoEndGame
  choices:
    - x: Done
'),

('test-set-var-script', '---
- step: message
  messages:
  - [''"You have played this scenario " + VAR("num_times_played", 0) + " times"'']
- step: set
  scope: team
  key: num_times_played
  to: VAR(''num_times_played'', 0) + 1
')

;

INSERT INTO scenarios (id, name, script, duration_min, difficulty, start_point_name, start_point, city, "order", description_html) VALUES 
    (123, 'Test Scenario', 'test-script', 30, 'easy', 'SE False Creek', '(49.273373, -123.102657)', 'vancouver', 100, '<p>This route (approximately 700m) starts in front of Science World and follows the Seawall to the plaza area in front of Craft Beer Market.</p>')
;
