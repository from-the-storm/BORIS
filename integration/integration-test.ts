import 'jest';
import { Builder } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { spawn, ChildProcess } from 'child_process';
import { buttonWithText, getHeaderText } from './webdriver-utils';
import { BorisTestBrowser, BorisPage } from './integration-steps';
import { Gender } from '../common/models';
import { sleep } from './integration-utils';
import { StepType } from '../common/game';

if (process.env.NODE_ENV !== 'test') {
    throw new Error("The test suite should be run with NODE_ENV=test");
}

async function spawnBrowserAndDriver(): Promise<BorisTestBrowser> {
    /*driver = await new Builder().forBrowser('chrome').setChromeOptions(
        // Simulate an iPhone 7. Disable touch because it's buggy with Selenium (click causes context menu to pop up)
        new chrome.Options().setMobileEmulation({deviceMetrics: {width: 375, height: 667, pixelRatio: 2, touch: false}})
    ).build();*/
    // Unforunately mobile emulation is buggy in newer versions of Chrome so we are just using the desktop version for now.
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(
        new chrome.Options().addArguments("--window-size=375,667")
    ).build();
    return new BorisTestBrowser(driver);
}

describe("BORIS Integration tests", () => {

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
    }, 8000);

    afterAll(async () => {
        // To kill the boris server, which is a child of this child process,
        // we need to kill the whole process group (grouped because we used
        // {detached: true} when spawning), by making the PID negative.
        process.kill(-borisServer.pid, 'SIGTERM');
    });

    test('Home Page Test', async () => {
        const browser = await spawnBrowserAndDriver();
        await browser.goToHomePage();
        expect(await browser.driver.getTitle()).toBe("BORIS");
        expect(await browser.getCurrentPage()).toEqual(BorisPage.HOME_PAGE);
        expect(await getHeaderText(browser.driver)).toBe("WOULD YOU SURVIVE THE END OF THE WORLD?");
        await browser.driver.quit();
    }, 10000);

    test('Registration Test', async () => {
        const browser = await spawnBrowserAndDriver();
        const loginLink = await browser.registerAccount({
            firstName: "Tom",
            email: 'tom@example.com',
            workInTech: true,
            occupation: "Mindlessly testing websites",
            age: 25,
            gender: Gender.Other,
        });

        // Login as that new user:
        await browser.loginWithLink(loginLink);
        // Now we should see the "Join Team" page
        expect(await browser.getCurrentPage()).toEqual(BorisPage.JOIN_OR_CREATE_TEAM);
        const teamCode = await browser.createTeam({
            teamName: "Dream Team",
            organizationName: "Canada TestCo Inc. LLP Limited",
        });
        // Now we should see the "Choose Scenario" page:
        expect(await browser.getCurrentPage()).toBe(BorisPage.CHOOSE_SCENARIO);
        // Go back to the home area:
        await browser.clickBackButton();
        // Leave the team:
        await browser.driver.findElement(buttonWithText("LOG OUT")).click();
        expect(await browser.getCurrentPage()).toBe(BorisPage.CHANGE_TEAM_OR_LOG_OUT);
        await browser.driver.findElement(buttonWithText("CHANGE TEAM")).click();
        await browser.finishUpdates();
        expect(await browser.getCurrentPage()).toEqual(BorisPage.JOIN_OR_CREATE_TEAM);
        // Join the team again, using an invalid code:
        await expect(browser.joinTeam('FOOBAR')).rejects.toHaveProperty('message', "Unable to join team: Invalid team code: FOOBAR");
        // Now use the right code:
        await browser.joinTeam(teamCode);
        await browser.driver.quit();
    }, 18000);

    test('Short Two-Player Runthrough', async () => {
        // Create two user accounts:
        const alex = await spawnBrowserAndDriver();
        const brian = await spawnBrowserAndDriver();

        await alex.loginWithLink(await alex.registerAccount({
            firstName: "Alex",
            email: 'alex@example.com',
            workInTech: true,
            occupation: "Mindlessly testing websites",
            age: 25,
            gender: Gender.Male,
        }));

        await brian.loginWithLink(await brian.registerAccount({
            firstName: "Brian",
            email: 'brian@example.com',
            workInTech: false,
            occupation: "Nothing technical",
            age: 23,
            gender: Gender.Male,
        }));

        // Create a team:
        const teamCode = await alex.createTeam({ teamName: "Team Rocket", organizationName: "Prepare For Trouble"});
        await brian.joinTeam(teamCode);

        // Now we should see the "Choose Scenario" page:
        for (const user of [alex, brian]) {
            expect(await user.getCurrentPage()).toBe(BorisPage.CHOOSE_SCENARIO);
        }

        await alex.selectScenarioInfo(100);
        expect(await getHeaderText(alex.driver)).toEqual("INTEGRATION SCENARIO");
        expect(await alex.driver.findElement({css: '.scenario-description'}).getText()).toEqual(
            "This scenario has a script very similar to real scenarios."
        );

        await alex.startScenario();
        // Now we should see the confirm page:
        expect(await alex.getCurrentPage()).toBe(BorisPage.CONFIRM_TEAM);
        expect (await alex.getConfirmPageTeamStatus()).toEqual({
            online: ["Alex", "Brian"],
            offline: [],
            canStartScenario: true,
        });

        // Now test that if Brian goes offline, Alex can't start the scenario.
        await brian.driver.get('about:blank');
        // And wait a bit for Alex's websocket updates:
        await sleep(500);
        expect (await alex.getConfirmPageTeamStatus()).toEqual({
            online: ["Alex"],
            offline: ["Brian"],
            canStartScenario: false,
        });

        // Now Brian returns:
        await brian.goToHomePage();
        // And wait a bit for Alex's websocket updates:
        await sleep(500);
        expect (await alex.getConfirmPageTeamStatus()).toEqual({
            online: ["Alex", "Brian"],
            offline: [],
            canStartScenario: true,
        });

        await alex.confirmTeamAndReallyStartScenario();
        await sleep(1_000);
        expect(await alex.getCurrentPage()).toBe(BorisPage.SPLASH_SCREEN);
        await sleep(10_000);

        // Figure out which roles each player has:
        let player_bds: BorisTestBrowser; // BURDENED, DOOMSAYING SCIENTICIAN
        let player_iw: BorisTestBrowser; // INTERPRETIVE WAYFINDER
        const alexFirstStep = await alex.getGameUiComponent(0);
        const brianFirstStep = await brian.getGameUiComponent(0);
        // Based on the script in 'integration-data.sql', the Doomsayer will receive a bulletin first.
        if (alexFirstStep.type == StepType.BulletinStep) {
            player_bds = alex;
            player_iw = brian;
        } else {
            expect(brianFirstStep.type).toEqual(StepType.BulletinStep)
            player_bds = brian;
            player_iw = alex;
        }

        // Now the non-Doomsayer players see this:
        expect((await player_iw.getGameUiComponent()).getMessages()).resolves.toEqual([
            "(Waiting on your teammate.)"
        ]);
        // Now the Doomsayer (who doesn't yet know they're the Doomsayer) sees the bulletin:
        expect((await player_bds.getGameUiComponent(0)).getBulletinText()).resolves.toEqual(
            "Please read aloud: Greetings! Are you ready to have your roles assigned via personality testing?",
        )
        await player_bds.getGameUiComponent().then(async latestStep => {
            expect(latestStep.type).toEqual(StepType.MultipleChoice);
            expect(latestStep.getChoices()).resolves.toEqual(["Done"]);
            await latestStep.selectChoice("Done");
        });

        await sleep(2_000);

        // Clean up:
        await Promise.all([alex.driver.quit(), brian.driver.quit()]);
    }, 60_000);

});
