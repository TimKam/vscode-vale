// Copyright (c) 2017 Sebastian Wiesner <swiesner@lunaryorn.com>

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { execFile } from "child_process";
import * as semver from "semver";
import {
    commands,
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    ExtensionContext,
    languages,
    ProgressLocation,
    Range,
    TextDocument,
    Uri,
    window,
    workspace,
} from "vscode";

/**
 * Whether a given document is elligible for linting.
 *
 * A document is elligible if it's in a supported format and saved to disk.
 *
 * @param document The document to check
 * @return Whether the document is elligible
 */
const isElligibleDocument = (document: TextDocument): boolean =>
    !document.isDirty && 0 < languages.match({
        language: "markdown",
        scheme: "file",
    }, document);

/**
 * Run a command in the current workspace and get its standard output.
 *
 * @param command The command array
 * @return The standard output of the program
 */
const runInWorkspace = (command: ReadonlyArray<string>): Promise<string> =>
    new Promise((resolve, reject) => {
        const cwd = workspace.rootPath || process.cwd();
        const maxBuffer = 1 * 1024 * 1024; // 1MB buffer for large results
        execFile(command[0], command.slice(1), { cwd, maxBuffer },
            (error, stdout) => {
                if (error) {
                    // Throw system errors, but do not fail if the command
                    // fails with a non-zero exit code.
                    console.error("Command error", command, error);
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
    });

/**
 * A severity from vale.
 */
type ValeSeverity = "suggestion" | "warning" | "error";

interface IValeError {
    readonly Check: string;
    readonly Context: string;
    readonly Description: string;
    readonly Line: number;
    readonly Link: string;
    readonly Message: string;
    readonly Span: [number, number];
    readonly Severity: ValeSeverity;
}

/**
 * The result of a vale run, mapping file names to a list of errors in the file.
 */
interface IValeResult {
    readonly [propName: string]: ReadonlyArray<IValeError>;
}

/**
 * Convert a Vale severity string to a code diagnostic severity.
 *
 * @param severity The severity to convert
 */
const toSeverity = (severity: ValeSeverity): DiagnosticSeverity => {
    switch (severity) {
        case "suggestion":
            return DiagnosticSeverity.Hint;
        case "warning":
            return DiagnosticSeverity.Warning;
        case "error":
            return DiagnosticSeverity.Error;
    }
};

/**
 * Convert a Vale error to a code diagnostic.
 *
 * @param message The message to convert
 */
const toDiagnostic = (error: IValeError): Diagnostic => {
    // vale prints one-based locations but code wants zero-based, so adjust
    // accordingly
    const range = new Range(error.Line - 1, error.Span[0] - 1,
        error.Line - 1, error.Span[1]);
    const message = error.Link ?
        `${error.Message} (${error.Check}, see ${error.Link})` :
        `${error.Message} (${error.Check})`;
    const diagnostic = new Diagnostic(
        range, message, toSeverity(error.Severity));
    diagnostic.source = "vale";
    diagnostic.code = error.Check;
    return diagnostic;
};

/**
 * Convert a vale result to a list of diagnostics.
 *
 * @param result The result to convert
 */
const toDiagnostics =
    (result: IValeResult): Map<string, ReadonlyArray<Diagnostic>> => {
        const diagnostics = new Map<string, ReadonlyArray<Diagnostic>>();
        Object.getOwnPropertyNames(result).forEach((fileName) =>
            diagnostics.set(fileName, result[fileName].map(toDiagnostic)));
        return diagnostics;
    };

/**
 * Lint a path, which is either a file or a directory.
 *
 * @param path The path to lint
 * @return A promise with the results of linting the path
 */
const runVale =
    (args: string | ReadonlyArray<string>): Promise<IValeResult> => {
        const command: ReadonlyArray<string> = [
            "vale",
            "--no-exit",
            "--output",
            "JSON",
            ...(typeof args === "string" ? [args] : args),
        ];
        console.info("Run vale as", command);
        return runInWorkspace(command).then((stdout) => JSON.parse(stdout));
    };

/**
 * Start linting vale documents.
 *
 * @param context The extension context
 */
const startLinting =
    (context: ExtensionContext, diagnostics: DiagnosticCollection): void => {
        const lint = (document: TextDocument) => {
            if (isElligibleDocument(document)) {
                runVale(document.fileName)
                    .catch((error): IValeResult => {
                        window.showErrorMessage(error.toString());
                        diagnostics.delete(document.uri);
                        return {};
                    })
                    .then((result) => {
                        // Delete old diagnostics for the document, in case we
                        // don't receive new diagnostics, because the document
                        // has no errors.
                        diagnostics.delete(document.uri);
                        toDiagnostics(result).forEach((messages, fileName) =>
                            diagnostics.set(Uri.file(fileName),
                                // tslint:disable-next-line:readonly-array
                                messages as Diagnostic[]));
                    });
            } else {
                Promise.resolve();
            }
        };

        workspace.onDidOpenTextDocument(lint, null, context.subscriptions);
        workspace.onDidSaveTextDocument(lint, null, context.subscriptions);
        workspace.textDocuments.forEach(lint);

        workspace.onDidCloseTextDocument(
            (d) => diagnostics.delete(d.uri), null, context.subscriptions);
    };

/**
 * Run value on the entire workspace.
 *
 * @return A promise with the results
 */
const runValeOnWorkspace = async (): Promise<IValeResult> => {
    // Explicitly find all elligible files outselves so that we respect
    // "files.exclude", ie, only look at files that are included in the
    // workspace.
    const extensions: ReadonlyArray<string> = ["md", "markdown"];
    const pattern = `**/*.{${extensions.join(",")}}`;
    const uris = await workspace.findFiles(pattern);
    return runVale(uris.map((u) => u.fsPath));
};

/**
 * Register commands for this extensions.
 *
 * @param context The extension context
 * @param diagnostics The diagnostic collection to put diagnostics in
 */
const registerCommands =
    (context: ExtensionContext, diagnostics: DiagnosticCollection): void => {
        const lintProgressOptions = {
            location: ProgressLocation.Window,
            title: "vale running on workspace",
        };
        const lintWorkspaceCommand = commands.registerCommand(
            "vale.lintWorkspace",
            () => window.withProgress(
                lintProgressOptions,
                () => runValeOnWorkspace()
                    .then(toDiagnostics)
                    .then((result) => {
                        diagnostics.clear();
                        result.forEach((errors, fileName) =>
                            diagnostics.set(Uri.file(fileName),
                                // tslint:disable-next-line:readonly-array
                                errors as Diagnostic[]));
                    })));

        context.subscriptions.push(lintWorkspaceCommand);
    };

/**
 * Get the version of vale.
 *
 * @return A promise with the vale version string as single element.  If vale
 * doesn't exist or if the version wasn't found the promise is rejected.
 */
const getValeVersion = (): Promise<string> =>
    runInWorkspace(["vale", "--version"])
        .then((stdout) => {
            const matches = stdout.match(/^vale version (.+)$/m);
            if (matches && matches.length === 2) {
                return matches[1];
            } else {
                throw new Error(
                    `Failed to extract vale version from: ${stdout}`);
            }
        });

/**
 * The version requirements for vale.
 *
 * We need at least 0.7.2 in this extension because earlier releases do not
 * process all command line arguments, which we need to lint the entire
 * workspace.
 *
 * See https://github.com/ValeLint/vale/issues/46 for details.
 */
const VERSION_REQUIREMENTS = ">= 0.7.2";

/**
 * Activate this extension.
 *
 * Start linting elligible files with vale.
 *
 * Initialization fails if vale is not installed or does not meet the version
 * requirements.
 *
 * @param context The context for this extension
 * @return A promise for the initialization
 */
export const activate = async (context: ExtensionContext): Promise<any> => {
    const version = await getValeVersion();
    if (semver.satisfies(version, VERSION_REQUIREMENTS)) {
        console.log("Found vale version", version,
            "satisfying", VERSION_REQUIREMENTS);
    } else {
        // tslint:disable-next-line:max-line-length
        throw new Error(`Vale version ${version} does not satisfy ${VERSION_REQUIREMENTS}`);
    }
    // Create and register a collection for our diagnostics
    const diagnostics = languages.createDiagnosticCollection("vale");
    context.subscriptions.push(diagnostics);

    startLinting(context, diagnostics);
    registerCommands(context, diagnostics);
};
