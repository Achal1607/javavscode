
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

import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
const NYC = require('nyc');
import 'ts-node/register';
import 'source-map-support/register';
const baseConfig = require("@istanbuljs/nyc-config-typescript");

const tty = require('tty');
if (!tty.getWindowSize) {
	tty.getWindowSize = (): number[] => {
		return [80, 75];
	};
}

export async function run(): Promise<void> {
	const nyc = new NYC({
		...baseConfig,
		cwd: path.join(__dirname, '..', '..', '..'),
		reporter: ['text-summary', 'html'],
		all: true,
		silent: false,
		instrument: true,
		hookRequire: true,
		hookRunInContext: true,
		hookRunInThisContext: true,
		include: ["out/**/*.js"],
		exclude: ["out/test/**"],
	});
	await nyc.reset();
	await nyc.wrap();

	Object.keys(require.cache).filter(f => nyc.exclude.shouldInstrument(f)).forEach(m => {
		console.warn('Module loaded before NYC, invalidating:', m);
		delete require.cache[m];
		require(m);
	});
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 60000
	});

	const testsRoot = path.resolve(__dirname, '..');

	const files: Array<string> = await new Promise((resolve, reject) =>
		glob(
			'**/**.test.js',
			{
				cwd: testsRoot,
			},
			(err, files) => {
				if (err) reject(err)
				else resolve(files)
			}
		)
	);
	files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

	const failures: number = await new Promise((resolve) => mocha.run(resolve))
	await nyc.writeCoverageFile()

	console.log(await captureStdout(nyc.report.bind(nyc)));

	if (failures > 0) {
		throw new Error(`${failures} tests failed.`)
	}
}

async function captureStdout(fn: any) {
	let w = process.stdout.write, buffer = '';
	process.stdout.write = (s) => { buffer = buffer + s; return true; };
	await fn();
	process.stdout.write = w;
	return buffer;
}