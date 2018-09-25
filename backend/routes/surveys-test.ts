import 'jest';

import { buildPreSurveyUrl } from './surveys';
import { User } from '../db/models';
import { Gender } from '../../common/models';

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
                "http://dev.propelsurveysolutions.ca/registration/en/activity/197/1605/?email=brian_test%40example.com&foreignid=12345&firstname=Bri%C3%A1n&gender=male&age=25-34"
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
                "http://dev.propelsurveysolutions.ca/registration/en/activity/197/1605/?email=gen_test%40example.com&foreignid=5678&firstname=Genderless&age=15-24"
            );
        });
    });
});
