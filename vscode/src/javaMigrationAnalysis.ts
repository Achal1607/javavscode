/*
  Copyright (c) 2023, Oracle and/or its affiliates.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

     https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import axios from 'axios';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as util from 'util';
import * as xml2js from 'xml2js';

const parseString = util.promisify(xml2js.parseString);
let logger: vscode.OutputChannel;
const OUTPUT_DIR_PATH = path.join(__dirname, 'jmigrate');
const JMIGRATE_JARS: { [key: string]: { downloadUrl: string, fileName: string } } = {
    // "analyzer": { fileName: "jmigrate-analyzer.jar", downloadUrl: "https://artifactory-builds.oci.oraclecorp.com/autonomous-java-release-maven-local/com/oracle/jms/oracle-jms-jmigrate/jmigrate-analyzer/jms.9.0.18/jmigrate-analyzer-jms.9.0.18.jar" },
    "html-report": { fileName: "jmigrate-html-report.jar", downloadUrl: "https://artifactory-builds.oci.oraclecorp.com/autonomous-java-release-maven-local/com/oracle/jms/oracle-jms-jmigrate/jmigrate-html/jms.9.0.18/jmigrate-html-jms.9.0.18.jar" },
    "third-party-lookup": { fileName: "third-party-lookup.jar", downloadUrl: "http://nbteam-oci5.s1.javaplatfo1bom.oraclevcn.com:8086/userContent/amit/project/orahub/master/thirdparty-lookup/target/thirdparty-lookup-1.0-SNAPSHOT.jar" }
};
let USER_DIR: string = "";
let JARS_DOWNLOAD_DIR = path.join(OUTPUT_DIR_PATH, 'jarFiles');
// const JSON_FILE_NAME = "migration";
const ANALYSIS_PATH = path.join("target", 'jmigrate');

const buildWorkspace = async (): Promise<any> => {
    try {
        const compileWorkspace = await vscode.commands.executeCommand("jdk.workspace.compile");
        if (!compileWorkspace) {
            throw new Error("Failed building the project");
        }
        return compileWorkspace;
    }
    catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Failed building the project");
    }
}

const identifyJarsPresentInTargetFolder = async (): Promise<string> => {
    try {
        const pomFiles: vscode.Uri[] = await vscode.workspace.findFiles('**/pom.xml');
        const jarFileNames: string[] = [];

        for await (const pomFile of pomFiles) {
            const content = await fs.promises.readFile(pomFile.fsPath);
            const parsedPom: any = await parseString(content.toString());
            if (parsedPom?.length > 1) {
                throw new Error(" Pom should have only 1 project tag");
            }
            const project = await parsedPom?.project;
            const artifactId = await project?.artifactId?.[0];
            const version = await project?.version?.[0];
            const jarName = `${artifactId}-${version}.jar`;
            jarFileNames.push(jarName);
        }
        const jarFiles: vscode.Uri[] = await vscode.workspace.findFiles('**/target/*.jar');
        const filterUsefulJars = jarFiles.filter(el => jarFileNames.includes(path.basename(el.fsPath)));
        return filterUsefulJars.map(el => el.fsPath).join(":");
    }
    catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Error identifying jar files in workspace");;
    }
}

const downloadJarFile = async (downloadPath: string, outputPath: string): Promise<void> => {
    try {
        const response = await axios({
            method: 'GET',
            url: downloadPath,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(outputPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Error downloading jar file");
    }
}

const jmigrateDownloadJarsHandler = async () => {
    try {
        for await (const { fileName, downloadUrl } of Object.values(JMIGRATE_JARS)) {
            const fileDownloadLocation = path.join(JARS_DOWNLOAD_DIR, fileName);
            if (fs.existsSync(fileDownloadLocation)) {
                continue;
            }
            await downloadJarFile(downloadUrl, fileDownloadLocation);

            console.log(fileName);
        }
    } catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Error downloading jmigrate jar files");
    }
}


const chooseTargetJDK = async (): Promise<string | null> => {
    try {
        const targetJDK = await vscode.window.showQuickPick(["11", "17", "21"], {
            title: 'Select target JDK',
            placeHolder: 'Migration report would be provided according to the selected JDK',
            canPickMany: false
        });
        if (targetJDK) {
            return targetJDK;
        }
        return null;
    } catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Target JDK not selected");
    }
}

const chooseMulipleTargetJDK = async (): Promise<string[] | null> => {
    try {
        const targetJDK = await vscode.window.showQuickPick(["11", "17", "21"], {
            title: 'Select target JDK',
            placeHolder: 'Migration report would be provided according to the selected JDK',
            canPickMany: true
        });
        if (targetJDK) {
            return targetJDK;
        }
        return [];
    } catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Target JDK not selected");
    }
}
const dirCreations = async () => {
    try {
        if (!fs.existsSync(OUTPUT_DIR_PATH)) {
            await fs.promises.mkdir(OUTPUT_DIR_PATH);
        }

        USER_DIR = path.join(USER_DIR, "jmigrate");
        if (!fs.existsSync(USER_DIR)) {
            await fs.promises.mkdir(USER_DIR, { recursive: true });
        }

        if (!fs.existsSync(JARS_DOWNLOAD_DIR)) {
            await fs.promises.mkdir(JARS_DOWNLOAD_DIR);
        }
    } catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Error creating directories");
    }
}

const executeTerminalCommand = async (command: string) => {
    return new Promise((resolve, reject) => {
        // Spawn the process
        const childProcess = cp.spawn(command, { shell: true });

        // Capture stdout
        childProcess.stdout.on('data', (data) => {
            logger.appendLine(data.toString());
        });

        // Capture stderr
        childProcess.stderr.on('data', (data) => {
            logger.appendLine(data.toString());
        });

        // Handle process exit
        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve("Sucess");
            } else {
                reject(`migration plugin command exited with code ${code}`);
            }
        });

        // Handle errors
        childProcess.on('error', (err) => {
            reject(err);
        });
    });
}


const getDependencies = async () => {
    const pomFiles: vscode.Uri[] = await vscode.workspace.findFiles('**/pom.xml');
    const dependenciesList: any = [];
    const dependenciesDependingOnProperties: any = [];
    const propertiesList: any = {};

    for await (const pomFile of pomFiles) {
        const content = await fs.promises.readFile(pomFile.fsPath);
        const parsedPom: any = await parseString(content.toString());
        const project = await parsedPom?.project;
        const dependencies = await project?.dependencies?.[0]?.dependency || [];
        const dependencyManagementDependencies = await project?.dependencyManagement?.[0]?.dependencies?.[0]?.dependency || [];
        dependencies.push(...dependencyManagementDependencies);

        dependencies.forEach((el: any) => {
            const { groupId, artifactId } = el;
            const obj = { groupId: groupId[0], artifactId: artifactId[0], version: '' };
            if (el?.version?.[0]) {
                if (el?.version?.[0]?.includes('project.parent.version')) {
                    const parentVersion = project?.parent?.[0]?.version?.[0];
                    dependenciesList.push(({ ...obj, version: parentVersion }));
                } else if (el?.version?.[0]?.startsWith("${")) {
                    dependenciesDependingOnProperties.push(({ ...obj, version: el.version[0] }));
                }
                else {
                    dependenciesList.push(({ ...obj, version: el.version[0] }));
                }
            }
        });

        const properties = project?.properties?.[0] || {};
        Object.keys(properties).forEach(el => { propertiesList[`${el}`] = properties[el][0] });
    }

    const mappingVersions = dependenciesDependingOnProperties.map((el: any) => ({
        groupId: el.groupId,
        artifactId: el.artifactId,
        version: propertiesList[el.version.substring(2, el.version.length - 1)]
    }));
    const dependenciesListWithVersions = dependenciesList.concat(mappingVersions.filter((el: any) => el.version != undefined && el.version != null));
    const withoutDuplicates = dependenciesListWithVersions.filter((obj: any, index: any) => {
        return index === dependenciesListWithVersions.findIndex((o: any) => obj.groupId === o.groupId && obj.artifactId === o.artifactId && obj.version === o.version);
    });

    return withoutDuplicates;
}

const thirdPartyLookup = async (targetJDK: string) => {
    try {
        const dependencies = await getDependencies();
        const dependenciesData = dependencies.map((el: any) => {
            const { groupId, artifactId, version } = el;
            return `${groupId},${artifactId},${version},${targetJDK}`;
        });
        const csvPath = path.join(USER_DIR, "thirdPartyLookup.csv");
        await fs.promises.writeFile(csvPath, dependenciesData.join("\n") + "\n", 'utf8');

        const classPath = `${path.join(JARS_DOWNLOAD_DIR, JMIGRATE_JARS["third-party-lookup"].fileName)}:${path.join(JARS_DOWNLOAD_DIR, JMIGRATE_JARS["html-report"].fileName)}`;
        const THIRD_PARTY_LOOKUP_COMMAND = `java -cp "${classPath}" com.oracle.thirdparty.lookup.Main bulkQuery "${csvPath}"`;
        await executeTerminalCommand(THIRD_PARTY_LOOKUP_COMMAND);
        const newName = path.join(USER_DIR, "report.csv");
        await fs.promises.rename(csvPath + ".out", newName);
        return newName;
    } catch (err: any) {
        logger.appendLine(err.message);
        throw new Error("Error in third party lookup service");
    }
}

const getPomFilePath = async () => {
    try {
        const pomFile: vscode.Uri[] = await vscode.workspace.findFiles('pom.xml');
        if (!pomFile.length) {
            throw new Error("Pom file not found");
        }
        return pomFile[0].fsPath;
    }
    catch (err: any) {
        logger.append(err?.message);
        throw new Error("No pom file found in the root directory");
    }
}

export const runMigrationAnalysis = async (userDir: string | undefined, log: vscode.OutputChannel): Promise<any | null> => {
    try {
        if (!userDir) {
            throw new Error("undefined user dir");
        }
        USER_DIR = userDir;
        logger = log;
        await dirCreations();
        // await buildWorkspace();
        // let obj: any = {};
        // let multipleTargetJDK: string[] | null = [];
        let csvReportPath: any = null;
        let migrationReport: any = null;
        let targetJDK: any;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            cancellable: true,
            title: 'Generating migration report'
        }, async (progress) => {

            progress.report({ increment: 0 });
            await jmigrateDownloadJarsHandler();
            // progress.report({ increment: 33 });
            // const jarFilePaths = await identifyJarsPresentInTargetFolder();

            // progress.report({ increment: 45 });
            targetJDK = await chooseTargetJDK();
            // multipleTargetJDK = await chooseMulipleTargetJDK();
            const pomPath = await getPomFilePath();
            // const jsonFilePath = path.join(USER_DIR, `${JSON_FILE_NAME}.json`);
            if (!pomPath || !targetJDK) return null;
            progress.report({ increment: 50 });

            // const JMIGRATE_MAVEN_PLUGIN_COMMAND = `mvn clean package  -Djmigrate.targetJDKVersions=${multipleTargetJDK.join(',')} com.oracle.jms.oracle-jms-jmigrate:jmigrate-maven-plugin:1.0:analyze -f ${pomPath}`;
            const excludePackages = "com.fasterxml,lombok,org.slf4j,com.google,org.glassfish,jakarta,io.netty,org.apache";
            const JMIGRATE_MAVEN_PLUGIN_COMMAND = `mvn clean package  -Djmigrate.targetJDKVersions=${targetJDK} -Djmigrate.excludedPackages=${excludePackages} com.oracle.jms.oracle-jms-jmigrate:jmigrate-maven-plugin:1.0:analyze -f ${pomPath}`;
            await executeTerminalCommand(JMIGRATE_MAVEN_PLUGIN_COMMAND);
            // if (!jarFilePaths.length) return null;

            // const JMIGRATE_JSON_COMMAND = `java -jar ${path.join(JARS_DOWNLOAD_DIR, JMIGRATE_JARS["analyzer"].fileName)} ${targetJDK} ${jarFilePaths} "${jsonFilePath}"`;
            // const JMIGRATE_HTML_COMMAND = `java -jar ${path.join(JARS_DOWNLOAD_DIR, JMIGRATE_JARS["html-report"].fileName)} "${jsonFilePath}"`;

            // progress.report({ increment: 50 });
            // await executeTerminalCommand(JMIGRATE_JSON_COMMAND);

            // progress.report({ increment: 75 });
            // await executeTerminalCommand(JMIGRATE_HTML_COMMAND);
            // multipleTargetJDK.forEach(el => {
            //     obj[`${el}`] = {
            //         thirdPartyReport: "",
            //         migrationreport: ""
            //     };
            // });
            // for await (const jdk of multipleTargetJDK) {
            //     const csvPathReport = await thirdPartyLookup(jdk);
            //     obj[`${jdk}`].thirdPartyReport = csvPathReport;
            // }
            csvReportPath = await thirdPartyLookup(targetJDK);
            progress.report({ increment: 100, message: "Report generation completed" });
        });
        if (vscode.workspace.workspaceFolders?.length) {
            const workspaceFolderPath = path.normalize(vscode.workspace.workspaceFolders[0].uri.fsPath);
            // multipleTargetJDK.forEach(el => {
            //     obj[`${el}`].migrationReport = path.join(workspaceFolderPath, ANALYSIS_PATH, el, "analysis", "index.html");
            // });
            migrationReport = path.join(workspaceFolderPath, ANALYSIS_PATH, targetJDK, "analysis", "index.html");
        }
        return { migrationReport, csvReportPath: csvReportPath };
    } catch (err: any) {
        logger.appendLine(err.message);
        throw err;
    }
}