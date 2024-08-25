
/*
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
import * as path from 'path';

import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

import * as fs from 'fs';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

        const vscodeExecutablePath: string = await downloadAndUnzipVSCode('stable');

        const outRoot = path.join(extensionDevelopmentPath, "out");
        const extDir = path.join(__dirname, "exts");
        const userDir = path.join(__dirname, "user");

        const testSuites = fs.readdirSync(path.join(__dirname, 'suite'));

        for await (const suiteName of testSuites) {
            // The path to test runner
            // Passed to --extensionTestsPath
            const extensionTestsPath = path.join(__dirname, 'suite', suiteName, 'index');
            const workspaceDir = path.join(__dirname, 'suite', suiteName, 'ws');
            
            // Clean workspace before starting tests
            await fs.promises.rmdir(workspaceDir, { recursive: true });
            await fs.promises.mkdir(workspaceDir, { recursive: true });

            if (!fs.statSync(workspaceDir).isDirectory()) {
                throw `Expecting ${workspaceDir} to be a directory!`;
            }

            // Download VS Code, unzip it and run the integration test
            await runTests({
                vscodeExecutablePath,
                extensionDevelopmentPath,
                extensionTestsPath,
                extensionTestsEnv: {
                    'ENABLE_CONSOLE_LOG': 'true',
                    "netbeans.extra.options": `-J-Dproject.limitScanRoot=${outRoot} -J-Dnetbeans.logger.console=true`
                },
                launchArgs: [
                    '--disable-extensions',
                    '--disable-workspace-trust',
                    '--extensions-dir', `${extDir}`,
                    '--user-data-dir', `${userDir}`,
                    workspaceDir
                ]
            });
        }
    } catch (err: any) {
        console.error('Failed to run tests');
        console.error(err.message);
        process.exit(1);
    }
}

main();
