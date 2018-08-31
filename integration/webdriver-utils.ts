import { WebElement, WebDriver } from "selenium-webdriver";

/**
 * Helper function to make sure that React has loaded and updated the DOM with any
 * pending state changes. Returns a promise that resolves to the number of matching
 * elements.
 *
 * @param driver The Selenium WebDriver instance
 */
export function waitForReactToRender(driver: WebDriver) {
    return driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1]; // Callback passed in by webdriver as last argument
        const checkIfReady = () => {
            if (window.__rootComponent) { // __rootComponent is set by us in main.tsx after initial state is loaded.
                // To check if React has finished rendering we make a no-op change to
                // the state any rely on React's post-update callback. This is guaranteed to be called
                // after any pending changes prior to this setState() call have been updated in the DOM.
                window.__rootComponent.setState({}, done);
            } else {
                window.setTimeout(checkIfReady, 50);
            }
        };
        checkIfReady();
    `);
}

/**
 * Install some monitoring so we can detect when HTTP requests are pending.
 * @param driver The Selenium WebDriver instance
 */
export function trackHttpRequests(driver: WebDriver) {
    return driver.executeScript(`
        window.__pendingHttpRequests = 0;
        (() => {
            const oldFetch = window.fetch;
            window.fetch = (input, init) => {
                __pendingHttpRequests++;
                const fetchPromise = oldFetch(input, init);
                fetchPromise.then(
                    () => { __pendingHttpRequests--; },
                    () => { __pendingHttpRequests--; }
                );
                return fetchPromise;
            }
        })();
    `);
}

/**
 * Wait until no HTTP requests are pending.
 * @param driver The Selenium WebDriver instance
 */
export function waitForHttpRequests(driver: WebDriver) {
    return driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1]; // Callback passed in by webdriver as last argument
        const checkIfReady = () => {
            if (window.__pendingHttpRequests === 0) {
                done();
            } else {
                window.setTimeout(checkIfReady, 10);
            }
        };
        checkIfReady();
    `);
}

/**
 * Helper function to count how many elements match the given CSS selector,
 * even for selectors that Selenium itself does not support.
 *
 * @param css The CSS selector to match
 * @param driver The Selenium WebDriver instance
 */
export function countElementsMatching(css: string, driver: WebDriver) {
    return driver.executeAsyncScript(`
        const css = arguments[0];
        const done = arguments[arguments.length - 1]; // Callback passed in by webdriver as last argument
        done(document.querySelectorAll(css).length);
    `, css);
}

export function elementMatchingWithText(css: string, text: string) {
    return async (driver: WebDriver) => {
        const elements = await driver.findElements({css, });
        const matchingElements = await Promise.all(elements.map(async (el: WebElement) => await el.getText() === text ? el : null));
        const result = matchingElements.filter(el => el !== null);
        if (result.length == 1) {
            return result;
        } else {
            throw new Error(`Unable to find element with CSS ${css} and text "${text}": ` + (result.length ? 'more than one match' : 'no match'));
        }
    }
}
export const buttonWithText = elementMatchingWithText.bind(undefined, 'button');


export async function getHeaderText(driver: WebDriver) {
    const header = await driver.findElement({css: 'h1'});
    return header.getText();
}
