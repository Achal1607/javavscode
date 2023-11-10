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

export const JDK_RELEASES_TRACK_URL = `https://www.java.com/releases/releases.json`;

export const ORACLE_JDK_BASE_DOWNLOAD_URL = `https://download.oracle.com/java`;

export const ORACLE_JDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS: JDK_VERSIONS_OBJ_TYPE = {
  "21": {
    version: '21.0.1'
  }, "17": {
    version: '17.0.9'
  }
};

export const OPENJDK_VERSION_FALLBACK_DOWNLOAD_VERSIONS: JDK_VERSIONS_OBJ_TYPE = {
  "21": {
    version: '21.0.1',
    baseDownloadUrl: 'https://download.java.net/java/GA/jdk21.0.1/415e3f918a1f4062a0074a2794853d0d/12/GPL/openjdk-21.0.1'
  }
};

export const OS_TYPES_SUPPORTED: {[key : string]: {nodeId: string, displayName: string}} = {
  "linux": {
    nodeId: "Linux",
    displayName: "Linux"
  },
  "macOS": {
    nodeId: "Darwin",
    displayName: "macOS"
  },
  "windows": {
    nodeId: "Windows_NT",
    displayName: "Microsoft Windows"
  },
};

export const MACHINE_ARCH_SUPPORTED: { [key: string]: string } = {
  "x64": "x64",
  "arm64": "aarch64"
};

export const ORACLE_JDK = {
  id: "oracleJDK",
  displayName: "Oracle JDK"
};

export const OPENJDK = {
  id: "openJDK",
  displayName: "OpenJDK",
};

export type JDK_VERSIONS_OBJ_TYPE = {
  [key: string]: {
    version: string,
    baseDownloadUrl?: string,
  }
};