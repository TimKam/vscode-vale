# VSCode vale

Thanks to all the work previous work from [lunaryorn](https://github.com/testthedocs/vscode-vale/commits?author=lunaryorn), this is a new maintained fork, with more features to come soon.

Lint documents with [Vale][vale] in [Visual Studio Code][code].

[vale]: https://errata-ai.github.io/vale/

[code]: https://code.visualstudio.com

## Prerequisites

[Install vale][1] **0.7.2 or newer**.

If vale is too old the extension fails to activate.  In this case please update Vale; the error message tells you the required version.

> By default the extension will use the global installed binary `vale`. In case you have the binary installed on a local project you can configure the extension to use the local path. See [configuration options](#configuration) below.

[1]: https://errata-ai.github.io/vale/#installation

[issue]: https://github.com/testthedocs/vscode-vale/issues/new

## Usage

Vale automatically checks a document when you open or save it.  Use the `Vale: Lint workspace` command to check the entire workspace.

Vale always runs from the workspace directory in either case, so if you put a [Vale configuration][config] in the workspace directory it will automatically pick it up.

This extension supports:

-   **Asciidoc**: _.adoc_ and _.asciidoc_
-   **Markdown**: _.md_ and _.markdown_
-   **reStructuredText**: _.rst_
-   **LaTeX**: _.tex_
-   **plain text**: _.txt_

[Open an issue][issue] or a pull request if you need support for **more document formats**, provided that [Vale][] supports them.

[config]: https://errata-ai.github.io/vale/config/

## Configuration

- `vscode-vale.path`: Specifies the path to the `vale` executable, useful if you don't want to use the global binary. The path should be relative to the workspace root folder.

  **Example**
  ```json
  {
    "vscode-vale.path": "node_modules/.bin/vale"
  }
  ```
