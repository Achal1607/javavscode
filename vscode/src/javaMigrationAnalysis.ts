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

import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';


const ANALYSIS_PATH = path.join("target", 'jmigrate');

export class JavaMigrationAnalysis {
    private targetJDK?: string;
    private pomPath?: string;
    private excludePackages?: string;
    private diagonsticsCollection: vscode.DiagnosticCollection
    private javaPath: string | undefined;

    constructor(private logger: vscode.OutputChannel) { 
        this.javaPath = vscode.workspace.getConfiguration('jdk').get('migration.jdkhome');
        this.diagonsticsCollection = vscode.languages.createDiagnosticCollection('jmigrate');
        vscode.workspace.onDidChangeConfiguration(params=>{
            if(params.affectsConfiguration('jdk.migration.jdkhome')){
                this.javaPath = vscode.workspace.getConfiguration('jdk').get('migration.jdkhome');
            }
        })
    }

    private resetDiagnosticCollection = () => {
        this.diagonsticsCollection.clear();
        this.diagonsticsCollection = vscode.languages.createDiagnosticCollection('jmigrate');
    }

    private chooseTargetJDK = async (): Promise<string | null> => {
        try {
            const targetJDK = await vscode.window.showQuickPick(["11", "17", "21"], {
                title: 'Select target JDK',
                placeHolder: 'Migration report would be provided according to the selected JDK',
                canPickMany: false
            });
            if (targetJDK) {
                this.targetJDK = targetJDK
            }
            return null;
        } catch (err: any) {
            this.logger.appendLine(err.message);
            throw new Error("Target JDK not selected");
        }
    }

    private getPomFilePath = async () => {
        try {
            const pomFile: vscode.Uri[] = await vscode.workspace.findFiles('pom.xml');
            if (!pomFile.length) {
                throw new Error("Pom file not found");
            }
            this.pomPath = pomFile[0].fsPath;
        }
        catch (err: any) {
            this.logger.append(err?.message);
            throw new Error("No pom file found in the root directory");
        }
    }

    private getExludePackages = async () => {
        const list = await vscode.window.showInputBox({
            title: "Exclude packages",
            prompt: "Enter comma(,) separated lists of packages needed to be excluded from the report"
        });

        this.excludePackages = list;
    }

    private executeTerminalCommand = async (command: string) => {
        return new Promise((resolve, reject) => {
            const childProcess = cp.spawn(command, { shell: true });

            childProcess.stdout.on('data', (data) => {
                this.logger.appendLine(data.toString());
            });

            childProcess.stderr.on('data', (data) => {
                this.logger.appendLine(data.toString());
            });

            childProcess.on('close', (code) => {
                if (code === 0) {
                    resolve("Sucess");
                } else {
                    reject(`migration plugin command exited with code ${code}`);
                }
            });

            childProcess.on('error', (err) => {
                reject(err);
            });
        });
    }


    private getLineContent = async (fileUri: vscode.Uri, lineNumber: number): Promise<vscode.TextLine> => {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const line = document.lineAt(lineNumber);

        return line;
    }

    private getAnalysisJsons = async () => {
        const analysisJsons: vscode.Uri[] = await vscode.workspace.findFiles('**/target/jmigrate/**/analysis.json');
        if (!analysisJsons.length) {
            throw new Error("analysis.json not found");
        }
        return analysisJsons;
    }

    private getDiagnosticsFromJson = async (workspacePath: string, jsonData: any) => {
        for await (const classReport of jsonData.classReports) {
            if(!classReport?.diagnostics?.length || classReport.url.includes('.m2')){
                continue;
            }
            const packagePath = classReport.className.split('/').slice(0, -1).join('/');
            const sourceUri = vscode.Uri.parse(path.join(workspacePath, 'src','main','java', packagePath, classReport.source));
            const diagnostics = [];
            for await (const diagnosticInfo of classReport.diagnostics) {
                const { location, message, severity, hyperlink } = diagnosticInfo;
                if(!location || !message || !severity){
                    continue;
                }
                const lineNumber = location.lineNumber - 1;
                const lineContent = await this.getLineContent(sourceUri, lineNumber);
                const range = new vscode.Range(lineNumber, lineContent.range.start.character, lineNumber, lineContent.range.end.character);

                let diagnosticSeverity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Information;
                switch (severity) {
                    case 'P1':
                        diagnosticSeverity = vscode.DiagnosticSeverity.Error;
                        break;
                    case 'P2':
                        diagnosticSeverity = vscode.DiagnosticSeverity.Error;
                        break;
                    case 'P3':
                        diagnosticSeverity = vscode.DiagnosticSeverity.Warning;
                        break;
                    case 'P4':
                        diagnosticSeverity = vscode.DiagnosticSeverity.Hint;
                        break;
                    case 'P5':
                        diagnosticSeverity = vscode.DiagnosticSeverity.Hint;
                        break;
                    default:
                        diagnosticSeverity = vscode.DiagnosticSeverity.Hint;
                        break;
                }

                const diagnosticMessage = `Severity: ${severity}\n ${message}`;
                const diagnostic = new vscode.Diagnostic(
                    range,
                    diagnosticMessage,
                    diagnosticSeverity
                );
                diagnostic.source = "Jmigrate";

                if (hyperlink) {
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(vscode.Uri.parse(hyperlink), new vscode.Position(lineNumber, lineContent.range.start.character)),
                            'Link to documentation'
                        )
                    ];
                }
                diagnostics.push(diagnostic);
            }
            this.diagonsticsCollection.set(sourceUri, diagnostics);
        }
    }

    public createDiagnostics = async () => {
        const analysisJsons = await this.getAnalysisJsons();
        this.resetDiagnosticCollection();
        for await (const analysisJsonPath of analysisJsons){
            const workspacePath = analysisJsonPath.fsPath.split('/').slice(0,-4).join('/');
            const jsonString = await vscode.workspace.fs.readFile(analysisJsonPath);
            const jsonData = JSON.parse(new TextDecoder().decode(jsonString));  
            await this.getDiagnosticsFromJson(workspacePath,jsonData);
        }
    }

    public runMigrationAnalysis = async (): Promise<any | null> => {
        try {

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                cancellable: true,
                title: 'Generating migration report'
            }, async (progress) => {

                progress.report({ increment: 0 });
                await this.chooseTargetJDK();
                await this.getPomFilePath();
                await this.getExludePackages();

                if (!this.pomPath || !this.targetJDK) return null;
                progress.report({ increment: 50 });

                const setJavaHome = `export JAVA_HOME=${this.javaPath} && echo $JAVA_HOME`;
                const JMIGRATE_MAVEN_PLUGIN_COMMAND = `mvn clean  -DskipTests package -Djmigrate.targetJDKVersions=${this.targetJDK} -Djmigrate.excludedPackages=${this.excludePackages} com.oracle.jms.oracle-jms-jmigrate:jmigrate-maven-plugin:1.0:analyze -f ${this.pomPath}`;
                if(this.javaPath){
                    await this.executeTerminalCommand(`${setJavaHome} && ${JMIGRATE_MAVEN_PLUGIN_COMMAND}`);
                }
                await this.executeTerminalCommand(JMIGRATE_MAVEN_PLUGIN_COMMAND);
                
                progress.report({ increment: 100, message: "Report generation completed" });
            });

            if (vscode.workspace.workspaceFolders?.length) {
                const workspaceFolderPath = path.normalize(vscode.workspace.workspaceFolders[0].uri.fsPath);
                return path.join(workspaceFolderPath, ANALYSIS_PATH, this.targetJDK!, "analysis", "index.html");
            }

            return null;
        } catch (err: any) {
            this.logger.appendLine(err.message);
            throw err;
        }
    }

}