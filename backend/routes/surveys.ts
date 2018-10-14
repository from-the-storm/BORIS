/**
 * Routes used only for redirecting users to research surveys.
 */
import * as express from 'express';
import '../express-extended';
import { Gender } from '../../common/models';
import { User } from '../db/models';
import { makeApiHelper, RequireUser } from './api-utils';
import { PRESURVEY_PROMPT_SEEN } from '../../common/api';
import { BorisDatabase } from '../db/db';

export const router = express.Router();

function buildQueryString(data: {[key: string]: string}) {
    return Object.keys(data).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key])).join('&');
}

export function buildPreSurveyUrl(user: User): string {
    const params: {[key: string]: string} = {
        email: user.email,
        foreignid: user.id.toString(10),
        firstname: user.first_name,
    };
    // Gender:
    if (user.survey_data.gender === Gender.Male) {
        params.gender = 'male';
    } else if (user.survey_data.gender === Gender.Female) {
        params.gender = 'female';
    }
    // Otherwise we just leave gender out
    // Age:
    if (user.survey_data.age === null) {}
    else if (user.survey_data.age <=  4) { params.age = '0-4'; }
    else if (user.survey_data.age <= 14) { params.age = '5-14'; }
    else if (user.survey_data.age <= 24) { params.age = '15-24'; }
    else if (user.survey_data.age <= 34) { params.age = '25-34'; }
    else if (user.survey_data.age <= 44) { params.age = '35-44'; }
    else if (user.survey_data.age <= 54) { params.age = '45-54'; }
    else if (user.survey_data.age <= 64) { params.age = '55-64'; }
    else if (user.survey_data.age <= 120) { params.age = '65+'; }
    // Redirect them:
    const queryString = buildQueryString(params);
    return `https://propelsurveysolutions.ca/registration/en/activity/197/1605/?${queryString}`;
}

/**
 * API endpoint for getting all email sent to the given address
 */
router.get('/presurvey', async (req, res) => {
    if (!req.user) {
        res.redirect('/');
    }
    res.redirect(buildPreSurveyUrl(req.user));
});

const apiMethod = makeApiHelper(router, /^\/survey/, RequireUser.Required);

/** Atomically update one field within a user's survey_data JSON blob. */
async function updateSurveyDataField(db: BorisDatabase, userId: number, fieldName: string, value: any) {
    const forceCast = typeof value === 'string' ? '::text' : ''; // to_jsonb() needs to know how to interpret a string type.
    await db.query(
        // use jsonb_set to guarantee that we don't affect other variables
        `UPDATE users SET survey_data = jsonb_set(survey_data, $2, to_jsonb($3${forceCast})) WHERE id = $1;`,
        [userId, `{${fieldName}}`, value], {}
    );
}

/**
 * API endpoint for marking the pre-scenario research survey prompt as having been seen.
 * Each user is prompted once, when they first register.
 */
apiMethod(PRESURVEY_PROMPT_SEEN, async (data, app, user) => {
    const db: BorisDatabase = app.get("db");
    const seen = !!data.seen;
    updateSurveyDataField(db, user.id, 'hasSeenPreSurveyPrompt', seen);
    return {result: 'ok'};
});
