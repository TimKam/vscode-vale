# Change Log
All notable changes to the "vale" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how
to structure this file.  This project does **not** adhere to [Semantic
Versioning](http://semver.org/)!

## [Unreleased]
### Added
- Add support for ReStructuredText, LaTeX and plain text (`.txt`) documents, see
  <https://github.com/lunaryorn/vscode-vale/issues/6> and
  <https://github.com/lunaryorn/vscode-vale/pull/7≥.

## 0.4.0 – 2017-12-09
### Added
- Support multi-root workspaces, see
  <https://github.com/lunaryorn/vscode-vale/issues/4>

### Changed
- Increase buffer size for `vale` processes to handle large results, see
  <https://github.com/lunaryorn/vscode-vale/issues/3>

### Changed
- Require vscode 1.15 or newer

## 0.3.1 – 2017-06-26
### Changed
- Change license from GPL-3 to MIT

## 0.3.0 – 2017-06-13
### Added
- Show status bar message while linting the entire workspace with vale, see
  <https://github.com/lunaryorn/vscode-vale/issues/2>.

## 0.2.0 – 2017-06-12
### Added
- Add `Vale: Lint workspace` command to run vale on all files in the current
  workspace, see <https://github.com/lunaryorn/vscode-vale/issues/1>.

### Changed
- Require Vale version 0.7.2 or newer.  Older vale releases do not lint all
  files given as arguments, see <https://github.com/ValeLint/vale/issues/46>.

## 0.1.2 – 2017-06-08
### Changed
- Use normal logo in Marketplace as it fits better in the overview page.

## 0.1.1 – 2017-06-08
### Fixed
- Use a proper marketplace description.

## 0.1.0 – 2017-06-08
This is the first release.

### Added
- Run vale on Markdown documents.
