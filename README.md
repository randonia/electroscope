# Electron Log Reader #

## Prerequisites ##
> TODO

* node (8.4+)
* npm
* electron-forge

## Creating a build ##
> How to create a build for distribution

The `package` script uses `electron-forge` to create a build

**Note:** Remember to bump the version using [SemVer](https://semver.org/) in `package.json` and run `npm install` in your commits prior to reaching this stage.

```shell
$ npm run package
```

1. This will build and package a new executable into `out/Logtail-TARGET-ARCH`
1. Zip this up using the naming convention `Logtail-SEMVER-TARGET-ARCH.zip`
    * eg: `LogTail-1.2.0-darwin-x64.zip` or `LogTail-1.1.1-win32-x64.zip`
1. Create a new release in Github and attach the new build archives
