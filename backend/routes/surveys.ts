/**
 * Routes used only for redirecting users to research surveys.
 */
import * as express from 'express';
import '../express-extended';
import { Gender } from '../../common/models';
import { User } from '../db/models';

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
    return `http://dev.propelsurveysolutions.ca/registration/en/activity/197/1605/?${queryString}`;
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
