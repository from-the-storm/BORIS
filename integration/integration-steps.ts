import 'jest';
import { WebDriver } from 'selenium-webdriver';
import {
    waitForReactToRender,
    waitForHttpRequests,
    countElementsMatching,
    buttonWithText,
    trackHttpRequests,
    elementMatchingWithText,
    getHeaderText,
} from './webdriver-utils';
import { borisURL, getEmailsSentTo } from './integration-utils';
import { Gender } from '../common/models';


/**
 * Go to the BORIS website and register a new user account.
 * Returns the URL used to login and verify the email address.
 * @param driver the webdriver to use
 * @param data the information to put in the registration form
 */
export async function registerAccount(driver: WebDriver, data: {firstName: string, email: string, workInTech: boolean, occupation: string, age: number, gender: Gender}): Promise<string> {
    await driver.get(borisURL);
    trackHttpRequests(driver);
    await waitForReactToRender(driver); // Not sure yet if this is necessary.
    const registerButton = await driver.findElement(buttonWithText("REGISTER!"));
    await registerButton.click();
    // See the consent page:
    expect(await getHeaderText(driver)).toBe("CONSENT #1");
    // Click the consent button:
    await driver.findElement(buttonWithText("I CONSENT")).then(btn => btn.click());
    // See the registration form:
    expect(await getHeaderText(driver)).toBe("CREATE A PROFILE");
    // If we prematurely click "Register", nothing should happen other than validation messages appearing:
    await driver.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
    expect(await getHeaderText(driver)).toBe("CREATE A PROFILE");
    // Fill out the form:
    expect(await countElementsMatching('input:invalid', driver)).toBe(10); // 6 fields but some are radio buttons
    await driver.findElement({css: 'input[name=firstName]'}).then(field => field.sendKeys(data.firstName));
    await driver.findElement({css: 'input[name=email]'}).then(field => field.sendKeys(data.email));
    await driver.findElement({css: 'input[name=workInTech][value='+(data.workInTech ? 'yes' : 'no')+']'}).then(field => field.click()); // "Work in tech: Yes"
    await driver.findElement({css: 'input[name=occupation]'}).then(field => field.sendKeys(data.occupation));
    await driver.findElement({css: 'input[name=age]'}).then(field => field.sendKeys(data.age));
    await driver.findElement({css: 'input[name=gender][value=o]'}).then(field => field.click()); // "Gender: Other"
    expect(await countElementsMatching('input:invalid', driver)).toBe(0);
    // Click "Register"
    const emailCountBeforeRegistering = (await getEmailsSentTo(data.email)).length;
    await driver.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
    await waitForHttpRequests(driver);
    await waitForReactToRender(driver);
    // User then sees a final message:
    expect(await getHeaderText(driver)).toBe("CHECK YOUR EMAIL");
    // Check the email that was sent to the user:
    const emails = await getEmailsSentTo(data.email);
    const emailCountAfterRegistering = emails.length;
    expect(emailCountAfterRegistering - emailCountBeforeRegistering).toBe(1);
    const registrationEmail = emails[emails.length - 1];
    expect(registrationEmail.subject).toBe("Log in to Apocalypse Made Easy");
    const loginLink = registrationEmail.html.match(/href="([^"]+)"/)[1];
    expect(loginLink).toMatch(/^http.*/);
    return loginLink;
}

export async function loginWithLink(driver: WebDriver, loginLink: string) {
    await driver.get(loginLink);
    trackHttpRequests(driver);
    await waitForReactToRender(driver); // Not sure yet if this is necessary.
}

export async function expectIsOnJoinTeamPage(driver: WebDriver) {
    expect(await getHeaderText(driver)).toBe("JOIN/CREATE TEAM");
}

/**
 * If the team code is displayed somewhere on the current page, this will get it.
 * @param driver the webdriver to use
 */
export async function getTeamCodeFromPage(driver: WebDriver): Promise<string> {
    const span = await driver.findElement({css: 'span.mono'});
    const teamCode = await span.getText();
    expect(teamCode).toHaveLength(5);
    return teamCode;
}

export async function createTeam(driver: WebDriver, data: {teamName: string, organizationName: string}): Promise<string> {
    await expectIsOnJoinTeamPage(driver);
    const createTeamButton = await driver.findElement(buttonWithText("CREATE A TEAM"));
    await createTeamButton.click();
    // Fill out the "Create Team" form
    expect(await getHeaderText(driver)).toBe("CREATE TEAM");
    expect(await countElementsMatching('input:invalid', driver)).toBe(1);
    await driver.findElement({css: 'input[name=teamName]'}).then(field => field.sendKeys("Dream Team"));
    await driver.findElement({css: 'input[name=organizationName]'}).then(field => field.sendKeys("Canada TestCo Inc. LLP Limited"));
    expect(await countElementsMatching('input:invalid', driver)).toBe(0);
    await driver.findElement(buttonWithText("CREATE MY TEAM")).then(btn => btn.click());
    await waitForHttpRequests(driver);
    return await getTeamCodeFromPage(driver);
}

export async function joinTeam(driver: WebDriver, teamCode: string) {
    await expectIsOnJoinTeamPage(driver);
    await driver.findElement(buttonWithText("JOIN A TEAM")).click();
    const codeInput = await driver.findElement({css: 'input[type=text]'});
    await codeInput.clear();
    await codeInput.sendKeys(teamCode);
    await driver.findElement(buttonWithText("JOIN TEAM")).then(btn => btn.click());
    await waitForHttpRequests(driver);
    const errorsFound = await driver.findElements({css: '.team-error'});
    if (errorsFound.length > 0) {
        const errorMessage = await errorsFound[0].getText();
        (await driver.findElement(elementMatchingWithText('a', "< Back"))).click();
        throw new Error(errorMessage);
    }
    expect(await getHeaderText(driver)).toBe("CHOOSE SCENARIO");
}
