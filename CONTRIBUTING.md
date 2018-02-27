# Contributing

Thank you for your interest in this project 😊 I appreciate all issues and pull
requests, and any kind of contribution 🙂

## Contributor documentation

### Make a release

1. Bump version in `package.json`.
2. Add a corresponding headline to `CHANGELOG.md`.
3. `git commit` changes and `git tag` the commit (`git tag -m 'vscode-value x.y.z' x.y.z`)
4. Run `yarn run vsce list-publishers` if you are unsure whether a publisher is
   set up.  If there is none see below before continuing.
5. Run `yarn publish`.
6. Bump `package.json` to a pre-release version, `git commit` and then push all
  changes.

If you have no publisher setup:

1. [Get a personal access token][1] for your Visual Studio team services
   account, and copy it.
2. Run `yarn run vsce login <nickname>`, with the nickname of that account.
3. Paste the access token into the prompt.

[1]: https://code.visualstudio.com/docs/extensions/publish-extension#_get-a-personal-access-token

Yes, I should automate this process! 😊

