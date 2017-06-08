# VSCode vale

[![Build Status](https://travis-ci.org/lunaryorn/vscode-vale.svg?branch=master)](https://travis-ci.org/lunaryorn/vscode-vale)

Lint documents with [Vale][] in [Visual Studio Code][code].

[vale]: https://valelint.github.io/docs/
[code]: https://code.visualstudio.com

## Prerequisites

[Install value][1] and make sure that `vale` is in `$PATH`.

[1]: https://valelint.github.io/docs/#installation

## Usage

The extension runs value whenever a Markdown document is saved.

If you need support for further document formats please open a pull request, provided that value supports the document format too.

## License

Copyright © 2017  Sebastian Wiesner <swiesner@lunaryorn.com>

vscode-vale is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

vscode-vale is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with vscode-vale.  If not, see <http://www.gnu.org/licenses/>.
