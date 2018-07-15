import 'jest';
import {Builder, By, until, ThenableWebDriver, WebDriver} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { spawn, ChildProcess } from 'child_process';
import { waitForReactToRender, waitForHttpRequests, countElementsMatching, buttonWithText, trackHttpRequests, elementMatchingWithText } from './webdriver-utils';
import { borisURL, getEmailsSentTo } from './integration-utils';

if (process.env.NODE_ENV !== 'test') {
    throw new Error("The test suite should be run with NODE_ENV=test");
}

describe("BORIS Integration tests", () => {

    let driver: WebDriver;
    let borisServer: ChildProcess;

    beforeAll(async () => {
        // Spawn a new BORIS server for testing:
        const spawnedBorisServer = new Promise((resolve, reject) => {
            borisServer = spawn(
                '../node_modules/.bin/ts-node',
                ['backend-server.ts'],
                {cwd: __dirname + '/../backend', detached: true}
            );
            borisServer.stdout.once('data', resolve);
            borisServer.stdout.on('data', (data) => {
                //console.log(`backend: ${data}`);
            });
            borisServer.stderr.on('data', (data) => {
                console.log(`backend ERROR: ${data}`);
            });
            borisServer.on('error', (err) => { console.log(err); reject(err); })
        });
        await spawnedBorisServer;

        try {
            /*driver = await new Builder().forBrowser('chrome').setChromeOptions(
                // Simulate an iPhone 7. Disable touch because it's buggy with Selenium (click causes context menu to pop up)
                new chrome.Options().setMobileEmulation({deviceMetrics: {width: 375, height: 667, pixelRatio: 2, touch: false}})
            ).build();*/
            // Unforunately mobile emulation is buggy in newer versions of Chrome so we are just using the desktop version for now.
            driver = await new Builder().forBrowser('chrome').setChromeOptions(
                new chrome.Options().addArguments("--window-size=375,667")
            ).build();
        } catch (err) {
            console.error("* * * * Unable to initialize WebDriver for integration tests - all tests will fail.");
            // Unfortunately Jest/Jasmine will still try to run the tests.
            throw err;
        }

    }, 8000);

    afterAll(async () => {
        // To kill the boris server, which is a child of this child process,
        // we need to kill the whole process group (grouped because we used
        // {detached: true} when spawning), by making the PID negative.
        process.kill(-borisServer.pid, 'SIGTERM');
        await driver.quit();
    });

    const getHeaderText = async (driver: WebDriver) => {
        const header = await driver.findElement({css: 'h1'});
        return header.getText();
    }

    test('Home Page Test', async () => {
        await driver.get(borisURL);
        expect(await driver.getTitle()).toBe("BORIS");
        expect(await getHeaderText(driver)).toBe("WOULD YOU SURVIVE THE END OF THE WORLD?");
    }, 10000);

    test('Registration Test', async () => {
        const email = 'tom@example.com';
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
        await driver.findElement({css: 'input[name=firstName]'}).then(field => field.sendKeys("Tom"));
        await driver.findElement({css: 'input[name=email]'}).then(field => field.sendKeys(email));
        await driver.findElement({css: 'input[name=workInTech][value=yes]'}).then(field => field.click()); // "Work in tech: Yes"
        await driver.findElement({css: 'input[name=occupation]'}).then(field => field.sendKeys("Mindlessly testing websites"));
        await driver.findElement({css: 'input[name=age]'}).then(field => field.sendKeys("25"));
        await driver.findElement({css: 'input[name=gender][value=o]'}).then(field => field.click()); // "Gender: Other"
        expect(await countElementsMatching('input:invalid', driver)).toBe(0);
        // Click "Register"
        const emailCountBeforeRegistering = (await getEmailsSentTo(email)).length;
        await driver.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
        await waitForHttpRequests(driver);
        await waitForReactToRender(driver);
        // User then sees a final message:
        expect(await getHeaderText(driver)).toBe("CHECK YOUR EMAIL");
        // Check the email that was sent to the user:
        const emails = await getEmailsSentTo(email);
        const emailCountAfterRegistering = emails.length;
        expect(emailCountAfterRegistering - emailCountBeforeRegistering).toBe(1);
        const registrationEmail = emails[emails.length - 1];
        expect(registrationEmail.subject).toBe("Log in to Apocalypse Made Easy");
        const loginLink = registrationEmail.html.match(/href="([^"]+)"/)[1];
        expect(loginLink).toMatch(/^http.*/);


        // Login as that new user:
        await driver.get(loginLink);
        trackHttpRequests(driver);
        await waitForReactToRender(driver); // Not sure yet if this is necessary.
        // Now we should see the "Join Team" page
        expect(await getHeaderText(driver)).toBe("JOIN/CREATE TEAM");
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
        // Now we should see the "Choose Scenario" page:
        expect(await getHeaderText(driver)).toBe("CHOOSE SCENARIO");
        // Go back to the home area:
        await driver.findElement({css: 'img[alt*=Back]'}).then(btn => btn.click());
        const getTeamCodeFromheader = async () => {
            const loggedInheader = await driver.findElement({css: 'header .loggedin'});
            const text = (await loggedInheader.getText()).replace('\n', ' ');
            const regex = /TEAM CODE: ([A-Z0-9]+) .*/;
            expect(text).toMatch(regex);
            return text.match(regex)[1];
        }
        let teamCode = await getTeamCodeFromheader();
        expect(teamCode).toHaveLength(5);
        // Leave the team:
        await driver.findElement(buttonWithText("LOG OUT")).click();
        expect(await getHeaderText(driver)).toBe("GOING SO SOON?");
        await driver.findElement(buttonWithText("CHANGE TEAM")).click();
        await waitForHttpRequests(driver);
        expect(await getHeaderText(driver)).toBe("JOIN/CREATE TEAM");
        // Join the team again, using an invalid code:
        await driver.findElement(buttonWithText("JOIN A TEAM")).click();
        await driver.findElement({css: 'input[type=text]'}).then(field => field.sendKeys('FOOBAR'));
        await driver.findElement(buttonWithText("JOIN TEAM")).then(btn => btn.click());
        await waitForHttpRequests(driver);
        expect(await driver.findElement({css: '.team-error'}).getText()).toBe("Unable to join team: Invalid team code: FOOBAR");
        // Now use the right code:
        await driver.findElement({css: 'input[type=text]'}).then(async field => { await field.clear(); await field.sendKeys(teamCode) });
        await driver.findElement(buttonWithText("JOIN TEAM")).then(btn => btn.click());
        await waitForHttpRequests(driver);
        expect(await getHeaderText(driver)).toBe("CHOOSE SCENARIO");
    }, 18000);
});
