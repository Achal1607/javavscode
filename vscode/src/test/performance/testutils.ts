/*
 * Copyright (c) 2023-2025, Oracle and/or its affiliates.
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* This file has been modified for Oracle Java SE extension */

import * as assert from "assert";
import { glob } from 'glob';
import * as Mocha from 'mocha';
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import * as vscode from "vscode";
import { NbLanguageClient } from "../../lsp/nbLanguageClient";
import { extConstants } from "../../constants";
import { l10n } from "../../localiser";
import { globalState } from "../../globalState";

/**
 * Folder path currently opened in VSCode workspace
 * @returns String containing the folder path of the workspace
 */
export function assertWorkspace(): string {
	assert.ok(vscode.workspace, "workspace is defined");
	const dirs = vscode.workspace.workspaceFolders;
	assert.ok(dirs?.length, "There are some workspace folders: " + dirs);
	assert.strictEqual(dirs.length, 1, "One folder provided");
	let folder: string = dirs[0].uri.fsPath;
	return folder;
}

/**
 * Wait till all the commands of the extension are loaded
 * @returns promise that timeouts till all the commands are loaded
 */
export async function waitCommandsReady(): Promise<void> {
	return new Promise((resolve, reject) => {
		function checkCommands(attempts: number, cb: () => void) {
			try {
				// this command is parameterless
				vscode.commands.executeCommand(
					"jdk.java.attachDebugger.configurations"
				);
				console.log("JDK commands ready.");
				resolve();
			} catch (e) {
				if (attempts > 0) {
					console.log(
						"Waiting for JDK commands to be registered, " +
						attempts +
						" attempts to go..."
					);
					setTimeout(() => checkCommands(attempts - 1, cb), 100);
				} else {
					reject(
						new Error("Timeout waiting for JDK commands registration: " + e)
					);
				}
			}
		}
		awaitClient().then(() => checkCommands(5, () => { }));
	});
}

/**
 * Opens a file in VScode workspace
 * @param filePath
 * @returns promise that contains instance of the editor opened
 */
export async function openFile(filePath: string): Promise<vscode.TextEditor> {
	const document: vscode.TextDocument = await vscode.workspace.openTextDocument(
		vscode.Uri.file(filePath)
	);
	await vscode.window.showTextDocument(document);
	const editor = vscode.window.activeTextEditor;
	assert(editor !== undefined, "editor cannot be initialzed");

	return editor;
}

export const runShellCommand = async (command: string, folderPath: string) => {
	console.log(`commaned being executed: ${command}`);
	const shellExec = promisify(exec);
	const { stdout, stderr } = await shellExec(command, { cwd: folderPath });
	console.log(stdout);
	console.error(stderr);
};

export function runTestSuite(folder: string): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: '10m'
	});

	const testsRoot = path.resolve(folder);

	return new Promise(async (c, e) => {
		try {
			const testFilePaths = await glob('**/**.test.js', { cwd: testsRoot })
			
			const sortedTestFilePaths = testFilePaths.sort((a, b) => {
				return path.basename(a).localeCompare(path.basename(b));
			});

			sortedTestFilePaths.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
			mocha.run(failures => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (error) {
			console.error(error);
			e(error);
		}
	});
}

export const awaitClient = async () : Promise<NbLanguageClient> => {
    const extension = vscode.extensions.getExtension(extConstants.ORACLE_VSCODE_EXTENSION_ID);
    if (!extension) {
        return Promise.reject(new Error(l10n.value("jdk.extension.notInstalled.label")));
    }
    if(extension.isActive){
        return globalState.getClientPromise().client;
    }
    const waitForExtenstionActivation : Thenable<NbLanguageClient> = extension.activate().then(async () => {
        return await globalState.getClientPromise().client;
    });
    return Promise.resolve(waitForExtenstionActivation);
}
