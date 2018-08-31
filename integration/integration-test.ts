import 'jest';
import {Builder, WebDriver} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { spawn, ChildProcess } from 'child_process';
import { waitForHttpRequests, buttonWithText, getHeaderText } from './webdriver-utils';
import { borisURL } from './integration-utils';
import { registerAccount, loginWithLink, createTeam, getCurrentPage, joinTeam, BorisPage } from './integration-steps';
import { Gender } from '../common/models';

if (process.env.NODE_ENV !== 'test') {
    throw new Error("The test suite should be run with NODE_ENV=test");
}

async function spawnBrowserAndDriver(): Promise<WebDriver> {
    /*driver = await new Builder().forBrowser('chrome').setChromeOptions(
        // Simulate an iPhone 7. Disable touch because it's buggy with Selenium (click causes context menu to pop up)
        new chrome.Options().setMobileEmulation({deviceMetrics: {width: 375, height: 667, pixelRatio: 2, touch: false}})
    ).build();*/
    // Unforunately mobile emulation is buggy in newer versions of Chrome so we are just using the desktop version for now.
    return await new Builder().forBrowser('chrome').setChromeOptions(
        new chrome.Options().addArguments("--window-size=375,667")
    ).build();
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
            driver = await spawnBrowserAndDriver();
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

    test('Home Page Test', async () => {
        await driver.get(borisURL);
        expect(await driver.getTitle()).toBe("BORIS");
        expect(await getHeaderText(driver)).toBe("WOULD YOU SURVIVE THE END OF THE WORLD?");
    }, 10000);

    test('Registration Test', async () => {
        const email = 'tom@example.com';
        
        const loginLink = await registerAccount(driver, {
            firstName: "Tom",
            email,
            workInTech: true,
            occupation: "Mindlessly testing websites",
            age: 25,
            gender: Gender.Other,
        });

        // Login as that new user:
        await loginWithLink(driver, loginLink);
        // Now we should see the "Join Team" page
        expect(await getCurrentPage(driver)).toEqual(BorisPage.JOIN_OR_CREATE_TEAM);
        const teamCode = await createTeam(driver, {
            teamName: "Dream Team",
            organizationName: "Canada TestCo Inc. LLP Limited",
        });
        // Now we should see the "Choose Scenario" page:
        expect(await getHeaderText(driver)).toBe("CHOOSE SCENARIO");
        // Go back to the home area:
        await driver.findElement({css: 'img[alt*=Back]'}).then(btn => btn.click());
        // Leave the team:
        await driver.findElement(buttonWithText("LOG OUT")).click();
        expect(await getHeaderText(driver)).toBe("GOING SO SOON?");
        await driver.findElement(buttonWithText("CHANGE TEAM")).click();
        await waitForHttpRequests(driver);
        expect(await getCurrentPage(driver)).toEqual(BorisPage.JOIN_OR_CREATE_TEAM);
        // Join the team again, using an invalid code:
        await expect(joinTeam(driver, 'FOOBAR')).rejects.toHaveProperty('message', "Unable to join team: Invalid team code: FOOBAR");
        // Now use the right code:
        await joinTeam(driver, teamCode);
    }, 18000);
});
