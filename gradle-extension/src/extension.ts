/*
 * Copyright (c) 2023, Oracle and/or its affiliates.
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
import { ExtensionContext, window, OutputChannel } from 'vscode';

'use strict';

const SERVER_NAME: string = "Oracle Gradle extension";
function handleLog(log: OutputChannel, msg: string): void {
    log.appendLine(msg);
}

export async function activate(context: ExtensionContext) {
    await context.extension.activate();
    let log = window.createOutputChannel(SERVER_NAME);
    if (context.extension.isActive) {
        handleLog(log, "Activated Gradle extension");
    }
    else {
        handleLog(log, "Gradle extension not activated");
    }
}