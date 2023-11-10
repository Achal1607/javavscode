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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';
import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { JDK_RELEASES_TRACK_URL, JDK_VERSIONS_OBJ_TYPE, MACHINE_ARCH_SUPPORTED, OPENJDK, OPENJDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS, ORACLE_JDK_BASE_DOWNLOAD_URL, ORACLE_JDK, ORACLE_JDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS, OS_TYPES_SUPPORTED } from './constants';
import { handleLog } from './extension';


export class JdkDownloader {

  downloadView!: vscode.WebviewPanel;
  outputLogger!: vscode.OutputChannel;
  detectedOsType!: string;
  detectedMachineArch!: string;
  availVersions: { [key: string]: JDK_VERSIONS_OBJ_TYPE } = {};
  _selectedInstallOption!: string;
  _selectedOsType!: string;
  _selectedMachineArch!: string;
  _selectedVersion!: string;
  _selectedJdkType!: string;
  _selectedInstallationPath!: string;

  constructor(logger: vscode.OutputChannel) {
    this.outputLogger = logger;
  }

  set selectedInstallOption(value: string) {
    this._selectedInstallOption = value;
  }

  set selectedOsType(value: string) {
    this._selectedOsType = value;
  }

  set selectedVersion(value: string) {
    this._selectedVersion = value;
  }

  set selectedMachineArch(value: string) {
    this._selectedMachineArch = value;
  }

  set selectedJdkType(value: string) {
    this._selectedJdkType = value;
  }

  set selectedInstallationPath(value: string) {
    this._selectedInstallationPath = value;
  }

  private setDownloadView = () => {
    this.downloadView = vscode.window.createWebviewPanel(
      'jdkDownloader',
      'JDK Downloader',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );
  }

  private setDetectedOsType = () => {
    const machineOsIdentified = os.type();
    const supportOsObj: { [key: string]: string } = {}
    Object.keys(OS_TYPES_SUPPORTED).forEach(key => {
      supportOsObj[OS_TYPES_SUPPORTED[key].nodeId] = key;
    });

    if (machineOsIdentified in supportOsObj) {
      this.detectedOsType = supportOsObj[machineOsIdentified];
    }
    else {
      throw new Error(`Unsupported OS type: ${machineOsIdentified}. Supported OS types are: ${Object.values(supportOsObj).toString()}`);
    }
  }

  private setDetectedMachineArch = () => {
    const machineArchIdentified = os.arch();

    if (machineArchIdentified in MACHINE_ARCH_SUPPORTED) {
      this.detectedMachineArch = MACHINE_ARCH_SUPPORTED[machineArchIdentified];
    }
    else {
      throw new Error(`Unsupported machine architecture: ${machineArchIdentified}. Supported machine architectures are: ${Object.values(MACHINE_ARCH_SUPPORTED).toString()}`);
    }
  }

  private setAvailVersions = async () => {
    try {
      const response = await axios.get(JDK_RELEASES_TRACK_URL, { data: { ResponseType: 'document' }, timeout: 3500 });
      this.availVersions[ORACLE_JDK.id] = this.filterJDKVersionsAvail(response.data.data.releases);
    } catch (error: any) {
      this.availVersions[ORACLE_JDK.id] = ORACLE_JDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS;
      handleLog(this.outputLogger, "Error fetching Oracle JDK versions dynamically, using fallback versions for oracle JDK");
      handleLog(this.outputLogger, error?.message);
    }

    this.availVersions[OPENJDK.id] = OPENJDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS;
  }

  private filterJDKVersionsAvail = (json: Array<any>): JDK_VERSIONS_OBJ_TYPE => {
    const deliveredVersions = json.filter(release => release.status == "delivered");

    const sortedVersionWise = deliveredVersions.sort((a, b) => parseInt(b.family) - parseInt(a.family));
    const latestVersion = sortedVersionWise[0];

    const ltsVersions = deliveredVersions.filter(release => {
      if (release.type === "Feature") {
        const dateDiff: number = new Date(release.eosl).getFullYear() - new Date(release.ga).getFullYear();
        return dateDiff > 5;
      }
      return false;
    });

    let latestLtsVersion = sortedVersionWise.filter(release => release.family === ltsVersions[0].family)[0];
    if (latestLtsVersion.family == latestVersion.family) {
      latestLtsVersion = sortedVersionWise.filter(release => release.family === ltsVersions[1].family)[0];
    }
    const jdkVersionsObj: JDK_VERSIONS_OBJ_TYPE = {
      [`${latestVersion.family}`]: {
        version: latestVersion.version
      },
      [`${latestLtsVersion.family}`]: {
        version: latestLtsVersion.version
      }
    };

    return jdkVersionsObj;
  }

  private initializeDownloaderParams = async () => {
    try {
      this.setDownloadView();
      this.setDetectedOsType();
      this.setDetectedMachineArch();
      await this.setAvailVersions();

    } catch (err: any) {
      handleLog(this.outputLogger, err.message);
      throw new Error("Something went wrong while initializing JDK downloader params");
    }
  }

  private receiveMessageFromDownloadView = async () => {
    try {
      this.downloadView.webview.onDidReceiveMessage(async (message) => {
        const { command, id: jdkType, jdkVersion, jdkOS, jdkArch, selectedInstallationOption } = message;

        this.selectedOsType = jdkOS;
        this.selectedInstallOption = selectedInstallationOption;
        this.selectedMachineArch = jdkArch;
        this.selectedVersion = jdkVersion;
        this.selectedJdkType = jdkType;
        if (command === 'downloadJDK') {
          const installationPath = await this.setInstallationPath();
          if (installationPath) {
            this.selectedInstallationPath = installationPath;
            if (this._selectedInstallOption === 'manual') {
              vscode.workspace.getConfiguration('jdk').update('jdkhome', installationPath, true);
              await this.installationCompletion();
              return;
            }

            vscode.window.showInformationMessage(`Downloading and completing setup of ${this._selectedJdkType === ORACLE_JDK.id ? ORACLE_JDK.displayName : OPENJDK.displayName} ${this._selectedVersion}...`);
            this.DownloadJDK();
          }
        }
      });
    } catch (err: any) {
      handleLog(this.outputLogger, err.message);
      throw new Error("Something went wrong while completing setup of JDK");
    }
  }

  private setInstallationPath = async (): Promise<string | null> => {
    const options: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: this._selectedInstallOption === 'manual' ? 'Select installed JDK' : 'Install in selected location'
    };

    const selectedFolders = await vscode.window.showOpenDialog(options);

    if (selectedFolders && selectedFolders.length > 0) {
      const selectedFolder = selectedFolders[0];
      return selectedFolder.fsPath;
    } else {
      vscode.window.showInformationMessage('No location selected.');
      return null;
    }
  }

  private installationCompletion = async () => {
    let dialogBoxMessage: string = `Completed installing ${this._selectedJdkType === ORACLE_JDK.id ? ORACLE_JDK.displayName : OPENJDK.displayName} ${this._selectedVersion}. Please reload Visual Studio Code to enable it.`;

    if (this._selectedInstallOption === "manual") {
      dialogBoxMessage = `Added JDK Path to the configuration settings. Please reload Visual Studio Code to enable it.`;
    }

    const selected = await vscode.window.showInformationMessage(dialogBoxMessage, "Reload now");
    if (selected === "Reload now") {
      await this.downloadView.dispose();
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  }

  private DownloadJDK = async () => {
    try {
      let downloadUrl: string = '';

      // Generate download url on the basis of the jdk type chosen
      if (this._selectedJdkType === OPENJDK.id) {
        if (this._selectedOsType === "windows") {
          downloadUrl = `${OPENJDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS[`${this._selectedVersion}`].baseDownloadUrl}_windows-${this._selectedMachineArch}_bin.zip`;
        }
        else {
          downloadUrl = `${OPENJDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS[`${this._selectedVersion}`].baseDownloadUrl}_${this._selectedOsType.toLowerCase()}-${this._selectedMachineArch}_bin.tar.gz`;
        }
      }
      else if (this._selectedJdkType === ORACLE_JDK.id) {
        if (this._selectedOsType === "windows") {
          downloadUrl = `${ORACLE_JDK_BASE_DOWNLOAD_URL}/${this._selectedVersion}/latest/jdk-${this._selectedVersion}_windows-${this._selectedMachineArch}_bin.zip`;
        }
        else {
          downloadUrl = `${ORACLE_JDK_BASE_DOWNLOAD_URL}/${this._selectedVersion}/latest/jdk-${this._selectedVersion}_${this._selectedOsType.toLowerCase()}-${this._selectedMachineArch}_bin.tar.gz`;
        }
      }

      // Define the target directory and file name
      const targetDirectory = path.join(__dirname, 'jdk_downloads');
      let fileName = '';
      if (this._selectedOsType === 'windows') {
        fileName = `${this._selectedJdkType}-${this._selectedVersion}_${this._selectedOsType}-${this._selectedMachineArch}_bin.zip`;
      }
      else {
        fileName = `${this._selectedJdkType}-${this._selectedVersion}_${this._selectedOsType}-${this._selectedMachineArch}_bin.tar.gz`;
      }

      // Create the target directory if it doesn't exist
      if (!fs.existsSync(targetDirectory)) {
        fs.mkdirSync(targetDirectory);
      }

      // Define the target file path
      const filePath = path.join(targetDirectory, fileName);
      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, Buffer.from(response.data));

      vscode.window.showInformationMessage(`${this._selectedJdkType === ORACLE_JDK.id ? ORACLE_JDK.displayName : OPENJDK.displayName} ${this._selectedVersion} for ${this._selectedOsType} download completed!`);

      await this.extractJDK(filePath);

    } catch (err) {
      throw err;
    }
  }

  private extractJDK = async (downloadedJdkPath: string): Promise<void> => {

    const extractCommand = `tar -xzf "${downloadedJdkPath}" -C "${this._selectedInstallationPath}"`;

    child_process.exec(extractCommand, async (error) => {
      if (error) {
        throw error
      } else {
        let binariesPath;
        const versionInfo = this.availVersions[this._selectedJdkType][this._selectedVersion].version;
        if (this._selectedOsType === "macOS") {
          const extractedDirectoryName = `${this._selectedJdkType}-${versionInfo}.jdk`;

          const oldFilePath = path.join(this._selectedInstallationPath, `jdk-${versionInfo}.jdk`);
          const newFilePath = path.join(this._selectedInstallationPath, extractedDirectoryName);
          if (fs.existsSync(newFilePath)) {
            fs.rmdirSync(newFilePath, { recursive: true });
          }
          fs.rename(oldFilePath, newFilePath, (err) => { throw err; });

          binariesPath = path.join(this._selectedInstallationPath, extractedDirectoryName, 'Contents', 'Home');
        }
        else {
          const extractedDirectoryName = `${this._selectedJdkType}-${versionInfo}`;

          const oldFilePath = path.join(this._selectedInstallationPath, `jdk-${versionInfo}`);
          const newFilePath = path.join(this._selectedInstallationPath, extractedDirectoryName);
          if (fs.existsSync(newFilePath)) {
            fs.rmdirSync(newFilePath, { recursive: true });
          }
          fs.rename(oldFilePath, newFilePath, (err) => { throw err; });

          binariesPath = path.join(this._selectedInstallationPath, extractedDirectoryName);
        }
        vscode.workspace.getConfiguration('jdk').update('jdkhome', binariesPath, true);
      }

      fs.unlink(downloadedJdkPath, async (err) => {
        if (err) {
          throw err;
        } else {
          await this.installationCompletion();
        }
      });
    });
  }

  public openDownloaderView = async () => {
    try {
      await this.initializeDownloaderParams();

      this.downloadView.webview.html = this.getDownloadPageHtml();

      // Attach message listener
      this.receiveMessageFromDownloadView();
    } catch (err: any) {
      vscode.window.showErrorMessage(err.message);
      handleLog(this.outputLogger, err.message);
    }
  }

  private generateDynamicContentsHTML = (): any => {
    const jdkInstallationHtmlDivArr = Object.keys(this.availVersions).map(jdkType => {
      return `
      <div class="jdk-version-container" id="${jdkType}Div">
        <div class="jdk-flex-basis">
          <label class="jdk-version-label">${jdkType === ORACLE_JDK.id ? "Select Oracle Java SE Version" : "Select Oracle OpenJDK Version"}</label>
          <br />
          
          <div class="jdk-version-dropdown">
              <select id="${jdkType}VersionDropdown">
                ${Object.keys(this.availVersions[jdkType]).map((key, index) => `<option value=${key} ${index === 0 ? 'default' : null}>JDK ${key}(${this.availVersions[jdkType][key].version})</option>`)}
              </select>
            </div>
          </div>
          
          <div class= "jdk-flex-basis">
            <label class="jdk-version-label"> Detected OS </label>
            <br />
            <div class="jdk-version-dropdown">
              <select id="${jdkType}OsTypeDropdown">
                ${Object.keys(OS_TYPES_SUPPORTED).map(osId => `<option value= ${osId} ${this.detectedOsType === osId ? 'selected' : null}> ${OS_TYPES_SUPPORTED[osId].displayName} </option>`)}
              </select>
            </div>
          </div>
          
          <div class="jdk-flex-basis">
            <label class="jdk-version-label"> Detected Machine Architecture </label>
            <br />
            <div class="jdk-version-dropdown">
              <select id="${jdkType}MachineArchDropdown">
                ${Object.keys(MACHINE_ARCH_SUPPORTED).map(key => `<option value = ${MACHINE_ARCH_SUPPORTED[key]} ${this.detectedMachineArch === MACHINE_ARCH_SUPPORTED[key] ? 'selected' : null}> ${key} </option>`)}
              </select>
            </div>
          </div>

          <div class="jdk-confirm-button">
            <button id="${jdkType}DownloadButton" class="select-jdk"> Install and start setup </button>
          </div>

        </div>
      </div>`;
    });

    const script = `
    const vscode = acquireVsCodeApi();
    let activeButton = null;
    
    ${Object.keys(this.availVersions).map(jdkType => `document.getElementById('${jdkType}')?.addEventListener('click', event => {
        hideOrDisplayDivs(event);
      });`).join('\n\t\t')}

    document.getElementById("addJDKPathManually")?.addEventListener('click', event => {
      vscode.postMessage({
        command: 'downloadJDK',
        installType: 'manual',
      });
    });

    ${Object.keys(this.availVersions).map(jdkType => `document.getElementById('${jdkType}DownloadButton')?.addEventListener('click', event => {
          triggerJDKDownload(event);
        });`).join('\n\t\t')}
    
    const hideOrDisplayDivs = (e) => {
      const { id } = e.target;
      
      if(activeButton){
        activeButton.classList.remove("active");
        const activeButtonDiv = document.getElementById(activeButton.id+'Div'); 
        activeButtonDiv.style.display ='none';
      }

      if(activeButton?.id !== id){
        activeButton = e.target;
        activeButton.classList.add("active");
        document.getElementById(id+'Div').style.display ='flex';
      } else{
        activeButton = null;
      }
    };

    const triggerJDKDownload = (e) => {
      const { id } = e.target;
      const jdkType = id === "${OPENJDK.id}DownloadButton" ? "${OPENJDK.id}" : "${ORACLE_JDK.id}";
      vscode.postMessage({
        command: 'downloadJDK',
        id: jdkType,
        jdkVersion: document.getElementById(jdkType+'VersionDropdown').value,
        jdkOS: document.getElementById(jdkType+'OsTypeDropdown').value,
        jdkArch: document.getElementById(jdkType+'MachineArchDropdown').value
      });
    }`

    return { jdkInstallationHtmlDivArr, script };
  }

  private getDownloadPageHtml = (): string => {
    try {
      const jdkInstallationDynamicHTML = this.generateDynamicContentsHTML();

      const downloaderHtml = `<!DOCTYPE html>
    <head>
      <title>JDK Downloader</title>
    </head>
    <style>
      .select-jdk {
        background-color: #007ACC;
        border: none;
        color: white;
        padding: 0.9em 1.8em;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 0.9em;
        cursor: pointer;
        margin: 0px 1em;
      }
    
      .active {
        background-color: #3399FF;
      }
    
      .select-jdk:hover {
        background-color: #3399FF;
      }
    
      select {
        appearance: none;
        border: 0;
        box-shadow: none;
        flex: 1;
        padding: 0 1em;
        color: #fff;
        background-color: #333337;
        cursor: pointer;
      }
    
      select::-ms-expand {
        display: none;
      }
    
      select:focus {
        outline: none;
      }
    
      .jdk-version-dropdown {
        position: relative;
        display: flex;
        width: 15em;
        height: 3em;
        border-radius: 0.25em;
        overflow: hidden;
        margin-top: 0.75em;
      }
    
      .jdk-version-dropdown::after {
        content: '\u25BC';
        position: absolute;
        top: 0;
        right: 0;
        padding: 1em;
        background-color: #333337;
        color: #999999;
        transition: 0.25s all ease;
        pointer-events: none;
      }
    
      .jdk-version-dropdown:hover::after {
        color: #656565;
      }
    
      .jdk-version-container {
        display: none;
        justify-content: space-around;
        flex-wrap: wrap;
        margin: 2em 1em;
      }
    
      .jdk-version-label {
        font-size: 1em;
      }
    
      .jdk-confirm-button {
        margin: 2em auto 0 33%;
      }
    
      .jdk-flex-basis {
        flex-basis: 33%;
      }
  
      .margin-one {
        margin: 1em;
      }
  
      .display-flex {
        display: flex;
      }
  
      .button-height {
        height: 100%;
      }
  
      .margin-or {
        margin-top: 0.6em;
        margin-right: 0.5em;  
      }
    </style>
    <body>
      <h1>JDK Downloader</h1>
      <p>This tool enables you to download either the Oracle Java SE JDK with <a href="https://www.java.com/freeuselicense"> Oracle No-Fee Terms and Conditions</a> or the Oracle OpenJDK builds under the <a href="http://openjdk.org/legal/gplv2+ce.html">GNU Public License with ClassPath Exception</a>.
      It will then handle the installation and configuration on your behalf.</p>
      <p>This enables you to take full advantage of all the features offered by this extension.</p>
      <br>
      <button id="${ORACLE_JDK.id}" class="select-jdk">Download Oracle Java SE JDK</button>
      OR 
      <button id="${OPENJDK.id}" class="select-jdk">Download Oracle OpenJDK</button> 
      OR 
      <button id="addJDKPathManually" class="select-jdk">Select installed JDK from my system</button>
      <br>
      <br>
      ${jdkInstallationDynamicHTML.jdkInstallationHtmlDivArr.join("\n")}
    </body>
    <script>
    ${jdkInstallationDynamicHTML.script}
    </script>
    </body>
    </html>
    `
      return downloaderHtml;
    } catch (err: any) {
      handleLog(this.outputLogger, err?.message);
      throw new Error("Some error occurred during loading downloader page");
    }
  }
};
