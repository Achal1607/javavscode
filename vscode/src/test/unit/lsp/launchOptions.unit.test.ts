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
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';
import * as handlers from '../../../configurations/handlers';
import { prepareNbcodeLaunchOptions } from '../../../lsp/launchOptions';

describe('prepareNbcodeLaunchOptions', () => {
    beforeEach(() => {
        sinon.stub(handlers, 'jdkHomeValueHandler').returns(null);
        sinon.stub(handlers, 'projectJdkHomeValueHandler').returns(null);
        sinon.stub(handlers, 'userdirHandler').returns('/tmp/userdir');
        sinon.stub(handlers, 'projectSearchRootsValueHandler').returns('');
        sinon.stub(handlers, 'isNetbeansVerboseEnabled').returns(false);
        sinon.stub(handlers, 'isDarkColorThemeHandler').returns(false);
        sinon.stub(handlers, 'lspServerVmOptionsHandler').returns([]);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('adds custom Maven settings path system property when configured', () => {
        sinon.stub(handlers, 'mavenUserSettingsValueHandler').returns('/workspace/project/.mvn/settings.xml');

        const launchOptions = prepareNbcodeLaunchOptions();

        expect(launchOptions).to.contain('-J-Dnetbeans.lsp.maven.userSettings=/workspace/project/.mvn/settings.xml');
    });

    it('does not add custom Maven settings path system property when not configured', () => {
        sinon.stub(handlers, 'mavenUserSettingsValueHandler').returns(null);

        const launchOptions = prepareNbcodeLaunchOptions();

        expect(launchOptions.some(option => option.startsWith('-J-Dnetbeans.lsp.maven.userSettings='))).to.equal(false);
    });
});
