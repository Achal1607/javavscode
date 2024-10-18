import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { WebviewPanel, window } from 'vscode';
import { LOGGER } from '../../../logger';
import { JdkDownloaderAction } from '../../../webviews/jdkDownloader/action';
import { JdkDownloaderView } from '../../../webviews/jdkDownloader/view';

describe('JDK Downloader action tests', () => {
  let jdkDownloaderAction: JdkDownloaderAction;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    jdkDownloaderAction = new JdkDownloaderAction(new JdkDownloaderView());
    sandbox.stub(LOGGER, 'log').callsFake((message) => {
      console.log(message);
    });
    sandbox.stub(LOGGER, 'error').callsFake((message) => {
      console.error(message);
    });
    sandbox.stub(LOGGER, 'warn').callsFake((message) => {
      console.warn(message);
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('JDK Downloader action attachListener tests', () => {
    
  });
});