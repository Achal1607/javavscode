import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { WebviewPanel, window } from 'vscode';
import { JdkDownloaderView } from '../../../webviews/jdkDownloader/view';
import { LOGGER } from '../../../logger';

describe('JDK Downloader view tests', () => {
  let jdkDownloaderView: JdkDownloaderView;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    jdkDownloaderView = new JdkDownloaderView();
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

  describe('JDK Downloader createView tests', () => {
    let onDidReceiveMessageStub: sinon.SinonStub;
    let createWebviewPanelStub: sinon.SinonStub;

    beforeEach(() => {
      createWebviewPanelStub = sandbox.stub(window, 'createWebviewPanel');
      onDidReceiveMessageStub = sandbox.stub();

      createWebviewPanelStub.returns({
        webview: {
          html: '',
          onDidReceiveMessage: onDidReceiveMessageStub
        },
        dispose: sandbox.stub()
      } as unknown as WebviewPanel);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe("Webview creation tests", () => {
      it("should create a webview panel", () => {
        jdkDownloaderView.createView();
        expect(createWebviewPanelStub.calledOnce).to.be.true;
        expect(createWebviewPanelStub.firstCall.args[3].enableScripts).to.be.true;
      });

      it("should enable scripts in webview panel", () => {
        jdkDownloaderView.createView();
        expect(createWebviewPanelStub.firstCall.args[3].enableScripts).to.be.true;
      });
    });

    describe("Default dropdown options tests", () => {
      it("should detect correct OS type", () => {

      });

      it("should detect correct machine architecture type", () => {

      });
    });

    describe("Webview HTML tests", () => {
      it("should set the webview HTML", () => {

      });

      it("should check HTML is correct syntactically", () => {

      });

      it("should check if correct default OS type is chosen on the options", () => {

      });

      it("should check if correct default machine architecture is chosen on the options", () => {

      });
    });

    it("should attached listener on the webview", () => {

    });
  });

  describe("JDK Downloader disposeView tests", () => {
    it("should dispose the webview", () => {

    });
  });
});