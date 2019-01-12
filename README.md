# VSCode vale

[![Build Status](https://travis-ci.org/lunaryorn/vscode-vale.svg?branch=master)](https://travis-ci.org/lunaryorn/vscode-vale)

Lint documents with [Vale][] in [Visual Studio Code][code].

[vale]: https://errata-ai.github.io/vale/
[code]: https://code.visualstudio.com

## Prerequisites

[Install vale][1] **0.7.2 or newer** and make sure that the `vale` executable is in `$PATH`.

If your setup does not let you to add `vale` to `$PATH`, please [open an issue][issue].

If vale is too old the extension fails to activate.  In this case please update Vale; the error message will tell you the required version.

[1]: https://errata-ai.github.io/vale/#installation
[issue]: https://github.com/lunaryorn/vscode-vale/issues/new

## Usage

Vale automatically checks a document when you open or save it.  Use the `Vale: Lint workspace` command to check the entire workspace.

Vale always runs from the workspace directory in either case, so if you put a [Vale configuration][config] in the workspace directory it will automatically pick it up.

Currently this extension only supports **Markdown, reStructuredText, LaTeX and plain text (.txt) documents**; please [open an issue][issue] or a pull request if you need support for **more document formats**, provided that [Vale][] supports them.

[config]: https://errata-ai.github.io/vale/config/

