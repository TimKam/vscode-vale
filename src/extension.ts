// Copyright (C) 2017 Sebastian Wiesner <swiesner@lunaryorn.com>
//
// This file is part of vscode-vale.
//
// vscode-vale is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// vscode-vale is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with vscode-vale.  If not, see <http://www.gnu.org/licenses/>.

import { execFile } from "child_process";
import { Observable, Observer } from "rxjs";

import * as vscode from "vscode";
import {
    Diagnostic,
    DiagnosticSeverity,
    Disposable,
    ExtensionContext,
    Range,
    TextDocument,
    Uri,
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
    !document.isDirty && 0 < vscode.languages.match({
        language: "markdown",
        scheme: "file",
    }, document);

/**
 * Run a command in the current workspace.
 *
 * @param command The command array
 * @return The standard output of the programms
 */
const runInWorkspace = (command: ReadonlyArray<string>): Observable<string> =>
    Observable.create((observer: Observer<string>): void => {
        const cwd = vscode.workspace.rootPath || process.cwd();
        execFile(command[0], command.slice(1), { cwd },
            (error, stdout) => {
                if (error) {
                    // Throw system errors, but do not fail if the command
                    // fails with a non-zero exit code.
                    console.error("Command error", command, error);
                    observer.error(error);
                } else {
                    observer.next(stdout);
                    observer.complete();
                }
            });
    });

/**
 * An event that can be subscribed to.
 */
type Event<T> = (handler: (document: T) => void) => Disposable;

/**
 * Observe a vscode event.
 *
 * @param event The event to observe
 * @return An observable which pushes every event
 */
const observeEvent = <T>(event: Event<T>): Observable<T> =>
    Observable.fromEventPattern(
        (handler) => event((d) => handler(d)),
        (_: any, subscription: Disposable) => subscription.dispose(),
        (d) => d as T,
    );

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
 * Lint a document with vale.
 *
 * @param document The document to check
 * @return The resulting diagnostics
 */
const lintDocument = (document: TextDocument): Observable<IValeResult> =>
    runInWorkspace(["vale", "--no-exit", "--output", "JSON", document.fileName])
        .map((stdout) => JSON.parse(stdout));

/**
 * Start linting vale documents.
 *
 * @param context The extension context
 */
const startLinting = (context: ExtensionContext): void => {
    const diagnostics = vscode.languages.createDiagnosticCollection("vale");
    context.subscriptions.push(diagnostics);

    const linting = Observable.from(vscode.workspace.textDocuments)
        .merge(observeEvent(vscode.workspace.onDidOpenTextDocument))
        .merge(observeEvent(vscode.workspace.onDidSaveTextDocument))
        .filter((document) => isElligibleDocument(document))
        .map((document) =>
            lintDocument(document)
                // Clear old diagnotics for the current document
                .do((_) => diagnostics.delete(document.uri))
                .catch((error) => {
                    vscode.window.showErrorMessage(error.toString());
                    diagnostics.delete(document.uri);
                    return Observable.empty<IValeResult>();
                }))
        .mergeAll()
        .map(toDiagnostics)
        .subscribe((result) => result.forEach((messages, fileName) =>
            // tslint:disable-next-line:readonly-array
            diagnostics.set(Uri.file(fileName), messages as Diagnostic[])));

    const closed = observeEvent(vscode.workspace.onDidCloseTextDocument)
        .subscribe((document) => diagnostics.delete(document.uri));

    // Register our subscriptions for cleanup by VSCode when the extension gets
    // deactivated
    [linting, closed].forEach((subscription) =>
        context.subscriptions.push({ dispose: subscription.unsubscribe }));
};

/**
 * Get the version of vale.
 *
 * @return An observable with the vale version string as single element
 * @throws An error if vale doesn't exist or if the version wasn't found
 */
const getValeVersion = (): Observable<string> =>
    runInWorkspace(["vale", "--version"])
        .map((stdout) => {
            const matches = stdout.match(/^vale version (.+)$/m);
            if (matches && matches.length === 2) {
                return matches[1];
            } else {
                throw new Error(
                    `Failed to extract vale version from: ${stdout}`);
            }
        });

/**
 * Activate this extension.
 *
 * Start linting elligible files with vale.
 *
 * Initialization fails if vale is not installed.
 *
 * @param context The context for this extension
 * @return A promise for the initialization
 */
export const activate = (context: ExtensionContext): Promise<any> =>
    getValeVersion().do((version) => {
        console.log("Found vale version", version);
        startLinting(context);
    }).toPromise();
