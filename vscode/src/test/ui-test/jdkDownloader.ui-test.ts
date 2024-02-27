import * as assert from 'assert';
import { Workbench, InputBox, VSBrowser, WebDriver, Key, QuickPickItem, WebView, By, EditorView, WebElement, Notification, NotificationType } from 'vscode-extension-tester';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { getConfigurationFromUserSettings, getDirContent } from './utilities/helperFunctions';
import { JDK_DOWNLOADER_WEBVIEW_TITLE, JDK_DOWNLOAD_COMPLETE_MESSAGE, JDK_DOWNLOAD_LOCATION, JDK_HOME_CONFIG, OPEN_JDK_DONWLOAD_BASE_FOLDER, OPEN_JDK_FOLDER_STRUCTURE, ORACLE_JDK_DONWLOAD_BASE_FOLDER, ORACLE_JDK_FOLDER_STRUCTURE, ROOT_UI_TEST_DIR } from './utilities/constants';

let jdkPath: string;
describe('Oracle JDK Downloader tests', function () {
    let driver: WebDriver;
    let webview: WebView;
    let workbench: Workbench;
    let oracleJDKButton: WebElement | null = null;
    let oracleJdkVersionDownloaded: string | null = null;
    let expectedJdkHomeSetting: string = '';

    before(async () => {
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        if (fs.existsSync(ROOT_UI_TEST_DIR)) {
            fs.rmSync(ROOT_UI_TEST_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(ROOT_UI_TEST_DIR);
    })

    it('JDK Downloader command is present', async () => {
        await workbench.openCommandPrompt();
        let input: InputBox = await InputBox.create();
        // check if the command exists
        await input.setText('>Download, install and use JDK');
        let picks: QuickPickItem[] | null = null;
        await driver.wait(async () => {
            picks = await input.getQuickPicks();
            return picks.length;
        });
        assert.ok(picks && (picks as QuickPickItem[]).length > 0, "Command 'Java: New Project...' not found");
        await input.selectQuickPick(0);
        const editor = new EditorView();
        await driver.wait(async () => {
            const titles = await editor.getOpenEditorTitles();
            return titles.includes(JDK_DOWNLOADER_WEBVIEW_TITLE);
        });
    }).timeout(20000);

    it('JDK Downloader contains oracle download option', async () => {
        webview = new WebView();
        await webview.switchToFrame();

        await driver.wait(async () => {
            oracleJDKButton = await webview.findWebElement(By.id("oracleJDK"));
            return oracleJDKButton;
        });
        assert.ok(oracleJDKButton, "Download Oracle JDK button absent");

        await webview.switchBack();
    }).timeout(20000);

    it('Detected OS and machine architecture are correct', async () => {
        await webview.switchToFrame();
        assert.ok(oracleJDKButton, "Download Oracle JDK button absent");
        await oracleJDKButton.click();

        const osVersionSelect = await webview.findWebElement(By.id("oracleJDKOsTypeDropdown"));
        const machineArchVersionSelect = await webview.findWebElement(By.id("oracleJDKMachineArchDropdown"));

        const defaultOsVersion = await osVersionSelect.getAttribute("value");
        const defaultMachineArchVersion = await machineArchVersionSelect.getAttribute("value");

        const actualOsVersion = (os.type() === "Linux" ? "linux" : (os.type() === "Darwin" ? "macOS" : "windows"));
        const actualMachineArchVersion = (os.arch() === "arm64" ? "aarch64" : "x64");

        assert.equal(defaultOsVersion, actualOsVersion, "Detected wrong OS type");
        assert.equal(defaultMachineArchVersion, actualMachineArchVersion, "Detected wrong machine architecture");

        await oracleJDKButton.click();
        await webview.switchBack();
    }).timeout(20000);

    it('Various OracleJDK versions are shown', async () => {
        await webview.switchToFrame();
        assert.ok(oracleJDKButton, "Download Oracle JDK button absent");
        await oracleJDKButton.click();

        const oracleJdkVersionSelect = await webview.findWebElement(By.id("oracleJDKVersionDropdown"));
        const dropdownOptions = await oracleJdkVersionSelect.findElements(By.css('option'));
        assert(dropdownOptions.length >= 2, "Oracle JDK versions in the dropdown are not listed");
        oracleJdkVersionDownloaded = await oracleJdkVersionSelect.getAttribute('value');

        await oracleJDKButton.click();
        await webview.switchBack();

    }).timeout(20000);

    it('Download OracleJDK', async () => {
        if (!fs.existsSync(JDK_DOWNLOAD_LOCATION)) {
            fs.mkdirSync(JDK_DOWNLOAD_LOCATION);
        }
        await webview.switchToFrame();

        assert.ok(oracleJDKButton, "Download Oracle JDK button absent");
        await oracleJDKButton.click();

        let downloadButton: WebElement | null = null;
        await driver.wait(async () => {
            downloadButton = await webview.findWebElement(By.id("oracleJDKDownloadButton"));
            return downloadButton;
        });
        assert.ok(downloadButton, "OracleJDK download button not found");
        await (downloadButton as WebElement).click();
        await webview.switchBack();
        const inputBox = await new InputBox().wait();
        await driver.wait(async () => {
            await inputBox.setText(JDK_DOWNLOAD_LOCATION);
            const defaultText = await inputBox.getText();
            return defaultText === JDK_DOWNLOAD_LOCATION;
        })
        const inputBoxText = await inputBox.getText();
        assert.equal(inputBoxText, JDK_DOWNLOAD_LOCATION, "Download location not set properly");

        // Start JDK download
        await inputBox.sendKeys(Key.ENTER);

        // Check using notifications if download completed
        await driver.wait(async () => {
            const notificationCenter = await workbench.openNotificationsCenter();
            const notifications = await notificationCenter.getNotifications(NotificationType.Any);
            const latestNotification: Notification | undefined = notifications?.[0];
            const message = await latestNotification?.getMessage();

            if (latestNotification && message?.trim() === JDK_DOWNLOAD_COMPLETE_MESSAGE.trim()) {
                const buttons = await latestNotification.getActions();
                const buttonTitle = await buttons[0].getTitle();
                assert.ok(buttons.length === 1, "JDK Download dialog box not proper");
                await latestNotification.takeAction(buttonTitle);
                return true;
            }
            await new Promise(f => setTimeout(f, 1000));
            return false;
        });
    }).timeout(300 * 1000);

    it('User settings.json is correctly updated after OracleJDK Download', async () => {
        if (os.type() === "Darwin") {
            expectedJdkHomeSetting = path.join(JDK_DOWNLOAD_LOCATION, `${ORACLE_JDK_DONWLOAD_BASE_FOLDER}-${oracleJdkVersionDownloaded}.jdk`, "Contents", "Home");
        } else {
            expectedJdkHomeSetting = path.join(JDK_DOWNLOAD_LOCATION, `${ORACLE_JDK_DONWLOAD_BASE_FOLDER}-${oracleJdkVersionDownloaded}`);
        }

        const jdkHomeSetting = await getConfigurationFromUserSettings(JDK_HOME_CONFIG);
        jdkPath = expectedJdkHomeSetting;
        assert.equal(expectedJdkHomeSetting, jdkHomeSetting, "Settings.json is not updated with correct jdk home path");
    }).timeout(20000);

    it('Verify downloaded OracleJDK directory structure', async () => {
        const contents = await getDirContent(expectedJdkHomeSetting);
        assert.equal(ORACLE_JDK_FOLDER_STRUCTURE.length, contents.length, "Downloaded folder structure doesn't match with expected");
        const filteredContents = contents.filter((el) => ORACLE_JDK_FOLDER_STRUCTURE.includes(el));
        assert.equal(filteredContents.length, contents.length, "Downloaded folder structure doesn't match with expected directories");
    }).timeout(20000);
});

describe('Open JDK Downloader tests', function () {
    let driver: WebDriver;
    let webview: WebView;
    let workbench: Workbench;
    let openJDKButton: WebElement | null = null;
    let openJdkVersionDownloaded: string | null = null;
    let expectedJdkHomeSetting: string = '';

    before(async () => {
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('JDK Downloader command is present', async () => {
        await workbench.openCommandPrompt();
        let input: InputBox = await InputBox.create();
        // check if the command exists
        await input.setText('>Download, install and use JDK');
        let picks: QuickPickItem[] | null = null;
        await driver.wait(async () => {
            picks = await input.getQuickPicks();
            return picks.length;
        });
        assert.ok(picks && (picks as QuickPickItem[]).length > 0, "Command 'Java: New Project...' not found");
        await input.selectQuickPick(0);
        const editor = new EditorView();
        await driver.wait(async () => {
            const titles = await editor.getOpenEditorTitles();
            return titles.includes(JDK_DOWNLOADER_WEBVIEW_TITLE);
        });
    }).timeout(20000);

    it('JDK Downloader contains OpenJDK download option', async () => {
        webview = new WebView();
        await webview.switchToFrame();

        await driver.wait(async () => {
            openJDKButton = await webview.findWebElement(By.id("openJDK"));
            return openJDKButton;
        });
        assert.ok(openJDKButton, "Download Open JDK button absent");

        await webview.switchBack();
    }).timeout(20000);

    it('Detected OS and machine architecture are correct', async () => {
        await webview.switchToFrame();
        assert.ok(openJDKButton, "Download Open JDK button absent");
        await openJDKButton.click();

        const osVersionSelect = await webview.findWebElement(By.id("openJDKOsTypeDropdown"));
        const machineArchVersionSelect = await webview.findWebElement(By.id("openJDKMachineArchDropdown"));

        const defaultOsVersion = await osVersionSelect.getAttribute("value");
        const defaultMachineArchVersion = await machineArchVersionSelect.getAttribute("value");

        const actualOsVersion = (os.type() === "Linux" ? "linux" : (os.type() === "Darwin" ? "macOS" : "windows"));
        const actualMachineArchVersion = (os.arch() === "arm64" ? "aarch64" : "x64");

        assert.equal(defaultOsVersion, actualOsVersion, "Detected wrong OS type");
        assert.equal(defaultMachineArchVersion, actualMachineArchVersion, "Detected wrong machine architecture");

        await openJDKButton.click();
        await webview.switchBack();
    }).timeout(20000);

    it('Various OpenJDK versions are shown', async () => {
        await webview.switchToFrame();
        assert.ok(openJDKButton, "Download OpenJDK button absent");
        await openJDKButton.click();

        const openJdkVersionSelect = await webview.findWebElement(By.id("openJDKVersionDropdown"));
        const dropdownOptions = await openJdkVersionSelect.findElements(By.css('option'));
        assert(dropdownOptions.length >= 1, "Open JDK versions in the dropdown are not listed");
        openJdkVersionDownloaded = await openJdkVersionSelect.getAttribute('value');

        await openJDKButton.click();
        await webview.switchBack();

    }).timeout(20000);

    it('Download OpenJDK', async () => {
        if (!fs.existsSync(JDK_DOWNLOAD_LOCATION)) {
            fs.mkdirSync(JDK_DOWNLOAD_LOCATION);
        }
        await webview.switchToFrame();
        assert.ok(openJDKButton, "Download OpenJDK button absent");
        await openJDKButton.click();

        let downloadButton: WebElement | null = null;
        await driver.wait(async () => {
            downloadButton = await webview.findWebElement(By.id("openJDKDownloadButton"));
            return downloadButton;
        });
        assert.ok(downloadButton, "OpenJDK download button not found");
        await (downloadButton as WebElement).click();
        await webview.switchBack();
        const inputBox = await new InputBox().wait();
        await driver.wait(async () => {
            await inputBox.setText(JDK_DOWNLOAD_LOCATION);
            const defaultText = await inputBox.getText();
            return defaultText === JDK_DOWNLOAD_LOCATION;
        })
        const inputBoxText = await inputBox.getText();
        assert.equal(inputBoxText, JDK_DOWNLOAD_LOCATION, "Download location not set properly");

        // Start JDK download
        await inputBox.sendKeys(Key.ENTER);

        // Check using notifications if download completed
        return await driver.wait(async () => {
            const notificationCenter = await workbench.openNotificationsCenter();
            const notifications = await notificationCenter.getNotifications(NotificationType.Any);
            const latestNotification: Notification | undefined = notifications?.[0];
            const message = await latestNotification?.getMessage();

            if (latestNotification && message?.trim() === JDK_DOWNLOAD_COMPLETE_MESSAGE.trim()) {
                const buttons = await latestNotification.getActions();
                const buttonTitle = await buttons[0].getTitle();
                assert.ok(buttons.length === 1, "JDK Download dialog box not proper");
                await latestNotification.takeAction(buttonTitle);
                return true;
            }
            return false;
        });
    }).timeout(300 * 1000);

    it('User settings.json is correctly updated after OpenJDK Download', async () => {
        if (os.type() === "Darwin") {
            expectedJdkHomeSetting = path.join(JDK_DOWNLOAD_LOCATION, `${OPEN_JDK_DONWLOAD_BASE_FOLDER}-${openJdkVersionDownloaded}.jdk`, "Contents", "Home");
        } else {
            expectedJdkHomeSetting = path.join(JDK_DOWNLOAD_LOCATION, `${OPEN_JDK_DONWLOAD_BASE_FOLDER}-${openJdkVersionDownloaded}`);
        }
        const jdkHomeSetting = await getConfigurationFromUserSettings(JDK_HOME_CONFIG);
        assert.equal(expectedJdkHomeSetting, jdkHomeSetting, "Settings.json is not updated with correct jdk home path");

    }).timeout(20000);

    it('Verify downloaded OpenJDK directory structure', async () => {
        const contents = await getDirContent(expectedJdkHomeSetting);
        assert.equal(OPEN_JDK_FOLDER_STRUCTURE.length, contents.length, "Downloaded folder structure doesn't match with expected");
        const filteredContents = contents.filter((el) => OPEN_JDK_FOLDER_STRUCTURE.includes(el));
        assert.equal(filteredContents.length, contents.length, "Downloaded folder structure doesn't match with expected directories");
    }).timeout(20000);
});

describe('Manual JDK add tests', function () {
    let driver: WebDriver;
    let webview: WebView;
    let workbench: Workbench;
    let manualDownloadButton: WebElement | null = null;

    before(async () => {
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('JDK Downloader command is present', async () => {
        await workbench.openCommandPrompt();
        let input: InputBox = await InputBox.create();
        // check if the command exists
        await input.setText('>Download, install and use JDK');
        let picks: QuickPickItem[] | null = null;
        await driver.wait(async () => {
            picks = await input.getQuickPicks();
            return picks.length;
        });
        assert.ok(picks && (picks as QuickPickItem[]).length > 0, "Command 'Java: New Project...' not found");
        await input.selectQuickPick(0);
        const editor = new EditorView();
        await driver.wait(async () => {
            const titles = await editor.getOpenEditorTitles();
            return titles.includes(JDK_DOWNLOADER_WEBVIEW_TITLE);
        });
    }).timeout(20000);

    it('JDK Downloader contains manual JDK path add option', async () => {
        webview = new WebView();
        await webview.switchToFrame();
        await driver.wait(async () => {
            manualDownloadButton = await webview.findWebElement(By.id("addJDKPathManually"));
            return manualDownloadButton;
        });
        assert.ok(manualDownloadButton, "Download JDK manually button absent");
        await webview.switchBack();
    }).timeout(20000);

    it('JDK Downloader add JDK home path manually', async () => {
        await webview.switchToFrame();
        await manualDownloadButton?.click();
        await webview.switchBack();

        const inputBox = await new InputBox().wait();
        await driver.wait(async () => {
            await inputBox.setText(jdkPath);
            const defaultText = await inputBox.getText();
            return defaultText === jdkPath;
        })
        const inputBoxText = await inputBox.getText();
        assert.ok(inputBoxText, "Download JDK manually able to select path");
        await inputBox.sendKeys(Key.ENTER);
    }).timeout(20000);

    it('User settings.json is correctly updated after adding path', async () => {
        const jdkHomeSetting = await getConfigurationFromUserSettings(JDK_HOME_CONFIG);
        assert.equal(jdkPath, jdkHomeSetting, "Settings.json is not updated with correct jdk home path");
    }).timeout(20000);

});
