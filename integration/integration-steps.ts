import 'jest';
import { WebDriver, Locator as WebDriverLocator } from 'selenium-webdriver';
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


export const enum BorisPage {
    HOME_PAGE = 'HOME_PAGE',
    REGISTER_CONSENT = 'REGISTER_CONSENT',
    REGISTER_FORM = 'REGISTER_FORM',
    REGISTER_COMPLETE = 'REGISTER_COMPLETE',
    JOIN_OR_CREATE_TEAM = 'JOIN_OR_CREATE_TEAM',
    JOIN_TEAM = 'JOIN_TEAM',
    CREATE_TEAM = 'CREATE_TEAM',
    CHANGE_TEAM_OR_LOG_OUT = 'CHANGE_TEAM_OR_LOG_OUT',
    CHOOSE_SCENARIO = 'CHOOSE_SCENARIO',
    UNKNOWN = 'UNKNOWN',
}

export class BorisTestBrowser {
    readonly driver: WebDriver;

    constructor(driver: WebDriver) {
        this.driver = driver;
    }

    private findElement(locator: WebDriverLocator) { return this.driver.findElement(locator); }
    private findElements(locator: WebDriverLocator) { return this.driver.findElements(locator); }

    private countElementsMatching(css: string) { return countElementsMatching(css, this.driver); }

    async finishUpdates() {
        await waitForHttpRequests(this.driver);
        await waitForReactToRender(this.driver);
    }

    async getCurrentPage(): Promise<BorisPage> {
        const headerText = await getHeaderText(this.driver);
        switch (headerText) {
            case "WOULD YOU SURVIVE THE END OF THE WORLD?": return BorisPage.HOME_PAGE;
            // User Registration:
            case "CONSENT #1": return BorisPage.REGISTER_CONSENT;
            case "CREATE A PROFILE": return BorisPage.REGISTER_FORM;
            case "CHECK YOUR EMAIL": return BorisPage.REGISTER_COMPLETE;
            // Teams:
            case "JOIN/CREATE TEAM": return BorisPage.JOIN_OR_CREATE_TEAM;
            case "JOIN TEAM": return BorisPage.JOIN_OR_CREATE_TEAM;
            case "CREATE TEAM": return BorisPage.CREATE_TEAM;
            case "GOING SO SOON?": return BorisPage.CHANGE_TEAM_OR_LOG_OUT;
            // Lobby:
            case "CHOOSE SCENARIO": return BorisPage.CHOOSE_SCENARIO;
        }
        return BorisPage.UNKNOWN;
    }

    async goToHomePage() {
        await this.driver.get(borisURL);
        trackHttpRequests(this.driver);
        await this.finishUpdates(); // Not sure yet if this is necessary.
    }

    /**
     * Go to the BORIS website and register a new user account.
     * Returns the URL used to login and verify the email address.
     * @param driver the webdriver to use
     * @param data the information to put in the registration form
     */
    async registerAccount(data: {firstName: string, email: string, workInTech: boolean, occupation: string, age: number, gender: Gender}): Promise<string> {
        if (await this.getCurrentPage() !== BorisPage.HOME_PAGE) {
            await this.goToHomePage();
        }
        const registerButton = await this.findElement(buttonWithText("REGISTER!"));
        await registerButton.click();
        // See the consent page:
        expect(await this.getCurrentPage()).toBe(BorisPage.REGISTER_CONSENT);
        // Click the consent button:
        await this.findElement(buttonWithText("I CONSENT")).then(btn => btn.click());
        // See the registration form:
        expect(await this.getCurrentPage()).toBe(BorisPage.REGISTER_FORM);
        // If we prematurely click "Register", nothing should happen other than validation messages appearing:
        await this.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
        expect(await this.getCurrentPage()).toBe(BorisPage.REGISTER_FORM);
        // Fill out the form:
        expect(await this.countElementsMatching('input:invalid')).toBe(10); // 6 fields but some are radio buttons
        await this.findElement({css: 'input[name=firstName]'}).then(field => field.sendKeys(data.firstName));
        await this.findElement({css: 'input[name=email]'}).then(field => field.sendKeys(data.email));
        await this.findElement({css: 'input[name=workInTech][value='+(data.workInTech ? 'yes' : 'no')+']'}).then(field => field.click()); // "Work in tech: Yes"
        await this.findElement({css: 'input[name=occupation]'}).then(field => field.sendKeys(data.occupation));
        await this.findElement({css: 'input[name=age]'}).then(field => field.sendKeys(data.age));
        await this.findElement({css: 'input[name=gender][value=o]'}).then(field => field.click()); // "Gender: Other"
        expect(await this.countElementsMatching('input:invalid')).toBe(0);
        // Click "Register"
        const emailCountBeforeRegistering = (await getEmailsSentTo(data.email)).length;
        await this.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
        await this.finishUpdates();
        // User then sees a final message:
        expect(await this.getCurrentPage()).toBe(BorisPage.REGISTER_COMPLETE);
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

    async loginWithLink(loginLink: string) {
        await this.driver.get(loginLink);
        trackHttpRequests(this.driver);
        await this.finishUpdates(); // Not sure yet if this is necessary.
    }

    /**
     * If the team code is displayed somewhere on the current page, this will get it.
     */
    async getTeamCodeFromPage(): Promise<string> {
        const span = await this.findElement({css: 'span.mono'});
        const teamCode = await span.getText();
        expect(teamCode).toHaveLength(5);
        return teamCode;
    }

    async clickBackButton() {
        await this.findElement({css: 'img[alt*=Back]'}).then(btn => btn.click());
    }

    async createTeam(data: {teamName: string, organizationName: string}): Promise<string> {
        expect(await this.getCurrentPage()).toEqual(BorisPage.JOIN_OR_CREATE_TEAM);
        const createTeamButton = await this.findElement(buttonWithText("CREATE A TEAM"));
        await createTeamButton.click();
        // Fill out the "Create Team" form
        expect(await this.getCurrentPage()).toBe(BorisPage.CREATE_TEAM);
        expect(await this.countElementsMatching('input:invalid')).toBe(1);
        await this.findElement({css: 'input[name=teamName]'}).then(field => field.sendKeys("Dream Team"));
        await this.findElement({css: 'input[name=organizationName]'}).then(field => field.sendKeys("Canada TestCo Inc. LLP Limited"));
        expect(await this.countElementsMatching('input:invalid')).toBe(0);
        await this.findElement(buttonWithText("CREATE MY TEAM")).then(btn => btn.click());
        await this.finishUpdates();
        return await this.getTeamCodeFromPage();
    }

    async joinTeam(teamCode: string) {
        expect(await this.getCurrentPage()).toEqual(BorisPage.JOIN_OR_CREATE_TEAM);
        await this.findElement(buttonWithText("JOIN A TEAM")).click();
        const codeInput = await this.findElement({css: 'input[type=text]'});
        await codeInput.clear();
        await codeInput.sendKeys(teamCode);
        await this.findElement(buttonWithText("JOIN TEAM")).then(btn => btn.click());
        await this.finishUpdates();
        const errorsFound = await this.findElements({css: '.team-error'});
        if (errorsFound.length > 0) {
            const errorMessage = await errorsFound[0].getText();
            (await this.findElement(elementMatchingWithText('a', "< Back"))).click();
            throw new Error(errorMessage);
        }
        expect(await this.getCurrentPage()).toBe(BorisPage.CHOOSE_SCENARIO);
    }

}