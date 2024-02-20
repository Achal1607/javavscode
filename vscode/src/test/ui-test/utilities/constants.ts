import * as path from 'path';

export const OUTPUT_CHANNEL_NAME: string = 'Oracle Java SE Language Server';
export const ROOT_UI_TEST_DIR: string = `${__dirname}/ui-tests`;
export const VSCODE_SETTINGS_PATH: string = path.join("test-resources","settings","User","settings.json");

// New Project tests constants
export const NEW_PROJECT_CREATION_LOCATION: string = path.join(ROOT_UI_TEST_DIR, 'newProjects');
export const DEFAULT_PROJ_MAVEN_NAME: string = "demoMaven";
export const DEFAULT_PROJ_GRADLE_NAME: string = "demoGradle";
export const DEFAULT_PROJ_PACKAGE_NAME: string = "org.yourcompany.yourproject";
export const DEFAULT_PROJ_MAVEN_MAIN_FILE_PATH: string = path.join('src', 'main', 'java', 'org', 'yourcompany', 'yourproject');
export const DEFAULT_PROJ_GRADLE_MAIN_FILE_PATH: string = path.join('app', 'src', 'main', 'java', 'org', 'yourcompany', 'yourproject');
export const DEFAULT_JAVA_MAVEN_FILE_NAME: string = "DemoMaven.java";
export const DEFAULT_JAVA_GRADLE_FILE_NAME: string = "App.java";
export const DEFAULT_JAVA_CLASS_NAME: string = "Class.java";
export const DEFAULT_NEW_JS_FILE_NAME: string = "javascript.js";
export const DEFAULT_NEW_TEST_FILE_NAME: string = "JUnit3Suite.java";

export const SAMPLE_CODE_REFACTOR: string = `/** Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license*/    
package org.yourcompany.yourproject;/** * * @author atalati*/
public class Class {public static void main(String[] args) {System.out.println("Hello World!");}}`;

export const SAMPLE_CODE_UNUSED_IMPORTS: string = `/** Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license*/
package org.oracle.logic;import java.lang.Float;import java.lang.Integer;/**** @author atalati*/
public class Class {public static void main(String[] args) {}}`;

export const SAMPLE_CODE_SORT_IMPORTS: string = `/** Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license */
package org.oracle.logic;import java.util.Date;import java.util.ArrayList;/** * ** @author atalati */
public class Class {public static void main(String[] args) {}public void testImports() {Date d = new Date();ArrayList b = new ArrayList<>();}}`;

// JDK Downloader tests constants
export const JDK_DOWNLOAD_LOCATION: string = path.join(ROOT_UI_TEST_DIR, 'jdkDownloader');
export const JDK_DOWNLOADER_WEBVIEW_TITLE: string = "JDK Downloader";
export const JDK_DOWNLOAD_COMMAND: string = "jdk.download.jdk";
export const JDK_HOME_CONFIG: string = "jdk.jdkhome";
export const JDK_DOWNLOAD_COMPLETE_MESSAGE: string = "Completed installing JDK. Please reload Visual Studio Code to enable it.";
export const ORACLE_JDK_DONWLOAD_BASE_FOLDER: string = "Oracle_JDK";
export const OPEN_JDK_DONWLOAD_BASE_FOLDER: string = "OpenJDK";
export const ORACLE_JDK_FOLDER_STRUCTURE: string[] = ["bin", "conf", "include", "jmods", "legal", "lib", "LICENSE", "README", "release", "man"];
export const OPEN_JDK_FOLDER_STRUCTURE: string[] = ["bin", "conf", "include", "jmods", "legal", "lib", "release"];