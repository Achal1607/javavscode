/*
  Copyright (c) 2026, Oracle and/or its affiliates.

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

import { expect } from 'chai';
import { describe, it } from 'mocha';
import * as path from 'path';
import { resolveMavenUserSettingsPath } from '../../../configurations/handlers';

describe('resolveMavenUserSettingsPath', () => {
    it('returns null for empty value', () => {
        expect(resolveMavenUserSettingsPath(null, undefined, undefined)).to.equal(null);
        expect(resolveMavenUserSettingsPath('   ', undefined, undefined)).to.equal(null);
    });

    it('keeps absolute path unchanged except normalization', () => {
        const absolute = path.join(path.sep, 'tmp', 'custom', 'settings.xml');
        expect(resolveMavenUserSettingsPath(absolute, undefined, undefined)).to.equal(path.normalize(absolute));
    });

    it('resolves relative path from first workspace folder', () => {
        const resolved = resolveMavenUserSettingsPath(
            path.join('.mvn', 'settings.xml'),
            [{ uri: { fsPath: path.join(path.sep, 'workspace', 'project') } }],
            undefined
        );

        expect(resolved).to.equal(path.normalize(path.join(path.sep, 'workspace', 'project', '.mvn', 'settings.xml')));
    });

    it('resolves relative path from workspace file directory when no folders are present', () => {
        const workspaceFile = path.join(path.sep, 'workspace', 'sample.code-workspace');
        const resolved = resolveMavenUserSettingsPath('settings/settings.xml', undefined, workspaceFile);

        expect(resolved).to.equal(path.normalize(path.join(path.sep, 'workspace', 'settings', 'settings.xml')));
    });
});
