import * as assert from 'assert';
import * as fs from 'fs';
import { Workbench, InputBox, VSBrowser, TextEditor, WebDriver, Key } from 'vscode-extension-tester';
import { DEFAULT_JAVA_CLASS_NAME, DEFAULT_JAVA_GRADLE_FILE_NAME, DEFAULT_JAVA_MAVEN_FILE_NAME, DEFAULT_NEW_JS_FILE_NAME, DEFAULT_NEW_TEST_FILE_NAME, DEFAULT_PROJ_GRADLE_MAIN_FILE_PATH, DEFAULT_PROJ_GRADLE_NAME, DEFAULT_PROJ_MAVEN_MAIN_FILE_PATH, DEFAULT_PROJ_MAVEN_NAME, DEFAULT_PROJ_PACKAGE_NAME, NEW_PROJECT_CREATION_LOCATION, ROOT_UI_TEST_DIR } from './utilities/constants';
import { waitForQuickPick, getInputText, getDirContent, deleteDirContent, setInputText, selectForQuickPick } from './utilities/helperFunctions';

// Create a Mocha suite
describe('New Project Creation tests', function () {
    let PROJ_PATH: string = '';
    let editor: TextEditor;
    let driver: WebDriver;
    let workbench: Workbench;

    this.beforeAll(async () => {
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        if (fs.existsSync(NEW_PROJECT_CREATION_LOCATION)) {
            fs.rmSync(NEW_PROJECT_CREATION_LOCATION, { recursive: true, force: true });
        }
        fs.mkdirSync(NEW_PROJECT_CREATION_LOCATION, { recursive: true });
    }).timeout(30*1000);

    it('Create new maven java project', async () => {
        await workbench.openCommandPrompt();
        let input: InputBox = await InputBox.create();

        // check if the command exists
        await setInputText(driver, input, '>Java: New Project...');
        // await input.setText('>Java: New Project...');
        const picks = await waitForQuickPick(driver, input);
        assert.ok(picks && picks.length > 0, "Command 'Java: New Project...' not found");
        await selectForQuickPick(driver, input, 0)

        // select build tool
        const picksBuildTool: string[] | undefined = await waitForQuickPick(driver, input);
        assert.ok(picksBuildTool !== undefined, "Build tools quickpick failed to show");
        assert.ok(picksBuildTool.length > 0, "No build tools available");
        await selectForQuickPick(driver, input, 0) //selected maven as build tool

        // select App type
        const picksAppType: string[] | undefined = await waitForQuickPick(driver, input);
        assert.ok(picksAppType !== undefined, "App type quickpick failed to show");
        assert.ok(picksAppType.length > 0, "App type not available");
        await selectForQuickPick(driver, input, 0) //select Java as application type

        // get project path
        const userProjPath: string | undefined = await getInputText(driver, input);
        PROJ_PATH = `${NEW_PROJECT_CREATION_LOCATION}/${DEFAULT_PROJ_MAVEN_NAME}`;
        const inputText = await setInputText(driver, input, PROJ_PATH);
        assert.ok(userProjPath !== undefined, "Project name input failed to show");
        assert(inputText && inputText.length, "Failed to set text in the input field");
        await input.sendKeys(Key.ENTER); //'$default_path/$DEFAULT_PROJ_MAVEN_NAME' is the project path

        // get project package
        const projPackage: string | undefined = await getInputText(driver, input);
        assert.ok(projPackage !== undefined, "Project package input failed to show");
        assert.strictEqual(projPackage, DEFAULT_PROJ_PACKAGE_NAME, "Project package name is not default");
        await input.sendKeys(Key.ENTER);

        // Project created successfully
        const dirPath = `${PROJ_PATH}/${DEFAULT_PROJ_MAVEN_MAIN_FILE_PATH}`;
        let filesList: any[] = [];
        await driver.wait(async () => {
            filesList = await getDirContent(dirPath);
            return filesList && filesList.length;
        });
        assert.ok(filesList.length > 0, "No file created");
        assert.ok(filesList.includes(DEFAULT_JAVA_MAVEN_FILE_NAME), "Java file not created with default name");

    }).timeout(100 * 1000);

    it('Create new gradle java project', async () => {
        await workbench.openCommandPrompt();
        let input: InputBox = await InputBox.create();

        // check if the command exists
        await input.setText('>Java: New Project...');
        const picks = await waitForQuickPick(driver, input);
        assert.ok(picks && picks.length > 0, "Command 'Java: New Project...' not found");
        await selectForQuickPick(driver, input, 0)

        // select build tool
        const picksBuildTool: string[] | undefined = await waitForQuickPick(driver, input);
        assert.ok(picksBuildTool !== undefined, "Build tools quickpick failed to show");
        assert.ok(picksBuildTool.length > 0, "No build tools available");
        await selectForQuickPick(driver, input, 1) //selected gradle as build tool

        // select App type
        const picksAppType: string[] | undefined = await waitForQuickPick(driver, input);
        assert.ok(picksAppType !== undefined, "App type quickpick failed to show");
        assert.ok(picksAppType.length > 0, "App type not available");
        await selectForQuickPick(driver, input, 0) //select Java as application type

        // get project path
        const userProjPath: string | undefined = await getInputText(driver, input);
        const GRADLE_PROJ_PATH = `${NEW_PROJECT_CREATION_LOCATION}/${DEFAULT_PROJ_GRADLE_NAME}`;
        const inputText = await setInputText(driver, input, GRADLE_PROJ_PATH);
        assert.ok(userProjPath !== undefined, "Project name input failed to show");
        assert(inputText && inputText.length, "Failed to set text in the input field");
        await input.sendKeys(Key.ENTER); // '$default_path/$DEFAULT_PROJ_GRADLE_NAME' is the project path

        // get project package
        const projPackage: string | undefined = await getInputText(driver, input);
        assert.ok(projPackage !== undefined, "Project package input failed to show");
        assert.strictEqual(projPackage, DEFAULT_PROJ_PACKAGE_NAME, "Project package name is not default");
        await input.sendKeys(Key.ENTER);

        // Project created successfully
        const dirPath = `${GRADLE_PROJ_PATH}/${DEFAULT_PROJ_GRADLE_MAIN_FILE_PATH}`;
        let filesList: any[] = [];
        await driver.wait(async () => {
            filesList = await getDirContent(dirPath);
            return filesList && filesList.length;
        });
        assert.ok(filesList.length > 0, "No file created");
        assert.ok(filesList.includes(DEFAULT_JAVA_GRADLE_FILE_NAME), "Java file not created with default name");

    }).timeout(100 * 1000);

    it('Add Java file using template', async () => {
        await VSBrowser.instance.openResources(PROJ_PATH);
        await VSBrowser.instance.waitForWorkbench();
        await workbench.openCommandPrompt();
        const input: InputBox = await InputBox.create();

        // check if the command exists
        await input.setText('>Java: New from Template...');
        const picks = await waitForQuickPick(driver, input);
        assert.ok(picks && picks.length > 0, "Command 'Java: New from Template...' not found");
        await selectForQuickPick(driver, input, "Java");

        // select file type
        const picksFileType: string[] | undefined = await waitForQuickPick(driver, input);
        assert.ok(picksFileType !== undefined, "File type quickpick failed to show");
        assert.ok(picksFileType.length > 0, "No file type available");
        await selectForQuickPick(driver, input, 0) //selected java as file type

        // select java class,interface,annotation,etc.
        const picksJavaFileType: string[] | undefined = await waitForQuickPick(driver, input);
        assert.ok(picksJavaFileType !== undefined, "Java file type quickpick failed to show");
        assert.ok(picksJavaFileType.length > 0, "Java file type not available");
        await selectForQuickPick(driver, input, 0) //select Java Class as java file type

        // get file path of new file
        const filePath: string | undefined = await getInputText(driver, input);
        assert.ok(filePath !== undefined, "File path input failed to show");
        assert.strictEqual(filePath, PROJ_PATH, "Default file path is incorrect");
        await input.sendKeys(Key.ENTER); //$PROJ_PATH is the file path

        // get file name
        const fileName: string | undefined = await getInputText(driver, input);
        assert.ok(fileName !== undefined, "File name input failed to show");
        assert.strictEqual(fileName, "Class", "File name is not default");
        await input.sendKeys(Key.ENTER);

        // File created successfully
        const dirPath = PROJ_PATH;
        let filesList: any[] = [];
        await driver.wait(async () => {
            filesList = await getDirContent(dirPath);
            return filesList && filesList.includes(DEFAULT_JAVA_CLASS_NAME);
        });
        assert.ok(filesList.length > 0, "No file created");
        assert.ok(filesList.includes(DEFAULT_JAVA_CLASS_NAME), "Java file not created with default name");

    }).timeout(50 * 1000);

    // it('Auto JavaDoc comment', async () => {
    //     // Open Class.java file
    //     await VSBrowser.instance.openResources(`${PROJ_PATH}/${DEFAULT_JAVA_CLASS_NAME}`);
    //     await VSBrowser.instance.waitForWorkbench();
    //     editor = new TextEditor();

    //     // Extract line number and content to add Javadoc comment 
    //     let getLineNum: number = -1;
    //     let lineContent: string = "";
    //     await driver.wait(async () => {
    //         editor = new TextEditor();
    //         getLineNum = await editor?.getLineOfText('public class');
    //         lineContent = await editor?.getTextAtLine(getLineNum - 1);
    //         return editor && getLineNum !== -1 && lineContent.length;
    //     });

    //     await driver.wait(async () => {
    //         await editor.typeTextAt(getLineNum - 1, lineContent?.length + 1, '\n');
    //         await editor.typeTextAt(getLineNum, 1, '/**');
    //         const isTextAdded = await editor?.getTextAtLine(getLineNum);
    //         await editor.moveCursor(getLineNum, 4);
    //         return isTextAdded.includes("/**");
    //     });

    //     // Check if content assist contains Javadoc comment option
    //     const assist = await editor.toggleContentAssist(true);
    //     assert(assist !== undefined, "cannot open javadoc suggestion");
    //     assert((await assist.getItems()).length > 0, "empty suggestion list");
    //     assert(await assist.hasItem('Javadoc comment'), "Javadoc comment not available");

    //     // Select Javadoc comment option
    //     const item = await assist.getItem('Javadoc comment');
    //     await item?.click();

    //     // Javadoc comment is created with proper syntax
    //     let javaDocContent: string = '', currLineContent: string = '';
    //     await driver.wait(async () => {
    //         await new Promise(f => setTimeout(f, 1000));
    //         javaDocContent = '';
    //         currLineContent = '';
    //         let i = 0;
    //         while (!currLineContent.includes('public class')) {
    //             currLineContent = await editor.getTextAtLine(getLineNum + i);
    //             javaDocContent += currLineContent;
    //             i++;
    //         }
    //         return javaDocContent.includes('@author');
    //     }, 20 * 1000);
    //     assert(javaDocContent.includes('@author'), "Javadoc comment doesn't have proper syntax");
    // }).timeout(20000);

    // it('Create new Gradle Java project', async () => {
    //     await new Workbench().openCommandPrompt();
    //     let input: InputBox = await InputBox.create();

    //     await new Promise(f => setTimeout(f, 2000));
    //     // check if the command exists
    //     await input.setText('>Java: New Project...');
    //     await new Promise(f => setTimeout(f, 2000));

    //     const picks = await input.getQuickPicks();
    //     assert.ok(picks.length > 0, "Command 'Java: New Project...' not found");
    //     await input.selectQuickPick(0);

    //     await new Promise(f => setTimeout(f, 2000));
    //     // select build tool
    //     const picksBuildTool: string[] | undefined = await waitForQuickPick(input, 20);
    //     assert.ok(picksBuildTool !== undefined, "Build tools quickpick failed to show");
    //     assert.ok(picksBuildTool.length > 0, "No build tools available");
    //     await input.selectQuickPick(1); //selected gradle as build tool

    //     await new Promise(f => setTimeout(f, 2000));
    //     // select App type
    //     const picksAppType: string[] | undefined = await waitForQuickPick(input, 10);
    //     assert.ok(picksAppType !== undefined, "App type quickpick failed to show");
    //     assert.ok(picksAppType.length > 0, "App type not available");
    //     await input.selectQuickPick(0); //select Java as application type

    //     await new Promise(f => setTimeout(f, 2000));
    //     // get project path
    //     const userProjPath: string | undefined = await getInputText(input, 10);
    //     PROJ_PATH = `${userProjPath}/${DEFAULT_PROJ_NAME}`;
    //     await input.setText(PROJ_PATH)
    //     assert.ok(userProjPath !== undefined, "Project name input failed to show");
    //     await new Promise(f => setTimeout(f, 2000));
    //     await input.sendKeys(Key.ENTER); //'$default_path/$DEFAULT_PROJ_NAME' is the project path

    //     await new Promise(f => setTimeout(f, 2000));
    //     // get project package
    //     const projPackage: string | undefined = await getInputText(input, 10);
    //     assert.ok(projPackage !== undefined, "Project package input failed to show");
    //     assert.strictEqual(projPackage, DEFAULT_PROJ_PACKAGE_NAME, "Project package name is not default");
    //     await input.sendKeys(Key.ENTER);
    //     await new Promise(f => setTimeout(f, 2000));

    //     // Project created successfully
    //     // const dirPath = `${PROJ_PATH}/${DEFAULT_PROJ_MAIN_FILE_PATH}`;
    //     // const filesList = await getDirContent(dirPath);
    //     // assert.ok(filesList.length > 0, "No file created");
    //     // assert.ok(filesList.includes(DEFAULT_JAVA_FILE_NAME), "Java file not created with default name");

    // }).timeout(50000);

    // it('Add other file type using template', async () => {
    //     await new Workbench().openCommandPrompt();
    //     const input: InputBox = await InputBox.create();

    //     await new Promise(f => setTimeout(f, 2000));
    //     // check if the command exists
    //     await input.setText('>Java: New from Template...');
    //     await input.sendKeys(Key.ENTER);
    //     await new Promise(f => setTimeout(f, 2000));

    //     const picks = await input.getQuickPicks();
    //     assert.ok(picks.length > 0, "Command 'Java: New from Template...' not found");
    //     await input.selectQuickPick('Other');

    //     await new Promise(f => setTimeout(f, 2000));
    //     // select file type
    //     const picksFileType: string[] | undefined = await waitForQuickPick(input, 10);
    //     assert.ok(picksFileType !== undefined, "File type quickpick failed to show");
    //     assert.ok(picksFileType.length > 0, "No file type available");
    //     await input.selectQuickPick('JavaScript File'); //selected html as file type

    //     await new Promise(f => setTimeout(f, 2000));
    //     // get file path of new file
    //     const filePath: string | undefined = await getInputText(input, 10);
    //     assert.ok(filePath !== undefined, "File path input failed to show");
    //     assert.strictEqual(filePath, PROJ_PATH, "Default file path is incorrect");
    //     await input.sendKeys(Key.ENTER); //$PROJ_PATH is the file path

    //     await new Promise(f => setTimeout(f, 2000));
    //     // get file name
    //     const fileName: string | undefined = await getInputText(input, 10);
    //     assert.ok(fileName !== undefined, "File name input failed to show");
    //     assert.strictEqual(fileName, "javascript", "File name is not default");
    //     await input.sendKeys(Key.ENTER);

    //     await new Promise(f => setTimeout(f, 2000));
    //     // File created successfully
    //     const dirPath = PROJ_PATH;
    //     const filesList = await getDirContent(dirPath);
    //     assert.ok(filesList.length > 0, "No file created");
    //     assert.ok(filesList.includes(DEFAULT_NEW_JS_FILE_NAME), "JS file not created with default name");

    // }).timeout(40000);

    // it('Add test suite using template', async () => {
    //     await new Workbench().openCommandPrompt();
    //     const input: InputBox = await InputBox.create();

    //     await new Promise(f => setTimeout(f, 2000));
    //     // check if the command exists
    //     await input.setText('>Java: New from Template...');
    //     await input.sendKeys(Key.ENTER);
    //     await new Promise(f => setTimeout(f, 2000));

    //     const picks = await input.getQuickPicks();
    //     assert.ok(picks.length > 0, "Command 'Java: New from Template...' not found");
    //     await input.selectQuickPick('Unit Tests');

    //     await new Promise(f => setTimeout(f, 2000));
    //     // select file type
    //     const picksFileType: string[] | undefined = await waitForQuickPick(input, 10);
    //     assert.ok(picksFileType !== undefined, "File type quickpick failed to show");
    //     assert.ok(picksFileType.length > 0, "No file type available");
    //     await input.selectQuickPick('Test Suite - JUnit 3.x'); //selected test suite 3.x as file type

    //     await new Promise(f => setTimeout(f, 2000));
    //     // get file path of new file
    //     const filePath: string | undefined = await getInputText(input, 10);
    //     assert.ok(filePath !== undefined, "File path input failed to show");
    //     assert.strictEqual(filePath, join(PROJ_PATH,'src','test','java'), "Default file path is incorrect");
    //     await input.sendKeys(Key.ENTER); //$PROJ_PATH/src/test/java is the file path

    //     await new Promise(f => setTimeout(f, 2000));
    //     // get file name
    //     const fileName: string | undefined = await getInputText(input, 10);
    //     assert.ok(fileName !== undefined, "File name input failed to show");
    //     assert.strictEqual(fileName, "JUnit3Suite", "File name is not default");
    //     await input.sendKeys(Key.ENTER);

    //     await new Promise(f => setTimeout(f, 2000));
    //     // File created successfully
    //     const dirPath = join(PROJ_PATH,'src','test','java');
    //     const filesList = await getDirContent(dirPath);
    //     assert.ok(filesList.length > 0, "No file created");
    //     assert.ok(filesList.includes(DEFAULT_NEW_TEST_FILE_NAME), "Test suite not created with default name");

    // }).timeout(40000);

    // Clean files created during tests
    after(async () => {
        const deleteStatus = await deleteDirContent(NEW_PROJECT_CREATION_LOCATION);
        if (!deleteStatus) {
            console.error("Cleaning files failed")
        }
    })
});
