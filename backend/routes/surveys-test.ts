import 'jest';

import { buildPreSurveyUrl } from './surveys';
import { User } from '../db/models';
import { Gender } from '../../common/models';
import { TestClient, TestServer } from '../test-lib/utils';
import { GET_INITIAL_STATE, PRESURVEY_PROMPT_SEEN } from '../../common/api';

describe("Survey link tests", () => {

    describe("Pre-survey URL", async () => {
        
        it("Generates the expected URL for a typical user", async () => {
            const user: User = {
                first_name: 'Brián',
                created: new Date(),
                email: 'brian_test@example.com',
                id: 12345,
                survey_data: {
                    age: 31,
                    gender: Gender.Male,
                    hasConsented: true,
                    occupation: "Tester",
                    workInTech: true,
                },
            };

            expect(buildPreSurveyUrl(user)).toBe(
                "https://propelsurveysolutions.ca/registration/en/activity/197/1605/?email=brian_test%40example.com&foreignid=12345&firstname=Bri%C3%A1n&gender=male&age=25-34"
            );
        });

        it("Generates the expected URL for another typical user", async () => {
            const user: User = {
                first_name: 'Genderless',
                created: new Date(),
                email: 'gen_test@example.com',
                id: 5678,
                survey_data: {
                    age: 23,
                    gender: Gender.NoAnswer,
                    hasConsented: true,
                    occupation: "Tester",
                    workInTech: true,
                },
            };

            expect(buildPreSurveyUrl(user)).toBe(
                "https://propelsurveysolutions.ca/registration/en/activity/197/1605/?email=gen_test%40example.com&foreignid=5678&firstname=Genderless&age=15-24"
            );
        });
    });
});

describe("Survey API", () => {

    describe("Pre-survey prompt", async () => {
        
        it("Can remember whether or not the pre-survey prompt was seen", async () => {

            const server = new TestServer();
            await server.ready();
            const client = new TestClient(server);
            await client.registerAndLogin();

            // At first, it should be marked as not seen:
            const result = await client.callApi(GET_INITIAL_STATE, {});
            expect(result.user.hasSeenPreSurveyPrompt).toBe(false);

            // Now mark it as seen:
            await client.callApi(PRESURVEY_PROMPT_SEEN, {seen: true});

            // Now it should be marked as seen:
            const result2 = await client.callApi(GET_INITIAL_STATE, {});
            expect(result2.user.hasSeenPreSurveyPrompt).toBe(true);

            await server.close();
        });

    });

});
