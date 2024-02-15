import * as fs from 'fs';
import { Editor, InputBox, TextEditor, VSBrowser, WebDriver, Workbench } from 'vscode-extension-tester';
import { VSCODE_SETTINGS_PATH } from './constants';

/**
 * Waits for quickpicks to show and returns result
 * 
 * @param driver 
 * @param input  
 * @param timeout 
 */
async function waitForQuickPick(driver: WebDriver, input: InputBox, timeout = 20000): Promise<string[] | undefined> {
    let items: string[] = [];
    await driver.wait(async () => {
        await new Promise(f => setTimeout(f, 1000));
        let picks = await input.getQuickPicks();
        if (picks && picks.length) {
            for (let pick of picks) {
                items.push(await pick.getLabel());
            }
            return true;
        }
        return false;
    }, timeout);

    return items;
}

/**
 * Waits for quickpicks to select
 * 
 * @param driver 
 * @param input  
 * @param findText  
 * @param timeout 
 */
async function selectForQuickPick(driver: WebDriver, input: InputBox, findText: string | number, timeout = 20000): Promise<void> {
    await driver.wait(async () => {
        const isPresent = await input.findQuickPick(findText) || false;
        if (isPresent) {
            await input.selectQuickPick(findText);
            return true;
        }
        await new Promise(f => setTimeout(f, 1000));
        return isPresent;
    }, timeout);
}

/**
 * Returns text inside input box when it becomes not empty
 * @param driver 
 * @param input 
 * @param timeout 
 * @returns 
 */
async function getInputText(driver: WebDriver, input: InputBox, timeout: number = 20000): Promise<string | undefined> {
    let text: string = "";
    await driver.wait(async () => {
        await new Promise(f => setTimeout(f, 1000));
        text = await input.getText();
        return text && text.length;
    }, timeout);

    return text;
}

/**
 * Sets text inside input box
 * @param driver 
 * @param input 
 * @param text 
 * @param timeout 
 * @returns 
 */
async function setInputText(driver: WebDriver, input: InputBox, text: string, timeout: number = 20000): Promise<string | undefined> {
    let inputText: string = "";
    await driver.wait(async () => {
        await input.setText(text);
        await new Promise(f => setTimeout(f, 1000));
        inputText = await input.getText();
        return inputText && inputText.length;
    }, timeout);

    return inputText;
}
  
/**
 * Returns files present in a directory
 * @param dirPath 
 * @param recursive 
 * @param tries 
 * @returns 
 */
async function getDirContent(dirPath: fs.PathLike, recursive = false, tries: number = 20): Promise<string[]> {
    while (tries) {
        try {
            const contents = await fs.promises.readdir(dirPath, {recursive });
            if (!contents || !contents.length) {
                throw new Error("Contents empty");
            }
            return contents;
        } catch (err) {
            tries--;
        }
    }
    return [];
}

/**
 * Deletes files present in a directory and directory itself
 * @param dirPath 
 * @returns 
 */
async function deleteDirContent(dirPath: fs.PathLike): Promise<boolean> {
    if (fs.existsSync(dirPath)) {
        fs.rmdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                return false;
            }
            return true;
        });
    }
    return true;
}

/**
 * Add code in the editor
 * @param editor
 * @param code
 * @returns 
 */
async function addCode(editor: TextEditor, code: string): Promise<void> {
    await editor.setText(code, true);
    await new Promise(f => setTimeout(f, 1000));

    await editor.formatDocument();
    await new Promise(f => setTimeout(f, 2000));
}

/**
 * Get configuration from user settings json
 * @param configKey
 * @returns 
 */
async function getConfigurationFromUserSettings(configKey: string): Promise<any> {
    let tries = 10;
    while (tries) {
        try {
            await VSBrowser.instance.waitForWorkbench();
            const workbench = new Workbench();
            const driver = (await workbench.wait()).getDriver();
            await workbench.executeCommand('workbench.action.openSettingsJson');
            let text: string = '';

            await driver.wait(async () => {
                const editor = new TextEditor();
                if (!editor) return false;
                text = await editor.getText();
                return text;
            });
            const settingsObj = JSON.parse(text);
            const configValue: string = settingsObj[configKey]
            if (!configValue) throw new Error("Null value");
            return configValue;
        } catch (err) {
            await new Promise(f => setTimeout(f, 1000));
            tries--;
        }
    }
    return null;
}

/**
 * Get configuration from user settings json
 * @param configKey
 * @returns 
 */
async function removeConfigurationFromUserSettings(configKey: string): Promise<any> {
    const settingsPath = await fs.promises.readFile(VSCODE_SETTINGS_PATH);
    const parsedJson: { [key: string]: string } = JSON.parse(settingsPath.toString());
    const updatedFileContent: { [key: string]: string } = {};
    Object.keys(parsedJson).forEach(key => {
        if (key == configKey) {
            return;
        }
        updatedFileContent[`${key}`] = parsedJson[`${key}`];
    });

    await fs.promises.writeFile(VSCODE_SETTINGS_PATH, JSON.stringify(updatedFileContent, null, 2));
}

export {
    waitForQuickPick,
    selectForQuickPick,
    getInputText,
    setInputText,
    getDirContent,
    deleteDirContent,
    addCode,
    getConfigurationFromUserSettings,
    removeConfigurationFromUserSettings
}

