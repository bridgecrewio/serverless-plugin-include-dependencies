'use strict';

const path = require('path');

const precinct = require('precinct');
const resolve = require('resolve');
const readPkgUp = require('read-pkg-up');
const requirePackageName = require('require-package-name');
const glob = require('glob');
const lodash = require('lodash');
const fs = require('fs');

function ignoreMissing(dependency, optional, peerDependenciesMeta) {
  return optional && dependency in optional
    || peerDependenciesMeta && dependency in peerDependenciesMeta && peerDependenciesMeta[dependency].optional;
}

module.exports = function(filename, serverless, cache) {
  const servicePath = serverless.config.servicePath;
  const modulePaths = new Set();
  const filePaths = new Set();
  const modulesToProcess = [];
  const localFilesToProcess = [filename];

  const shouldUseLocalNodeModules = lodash.get(serverless.service.custom, 'serverless-plugin-include-dependencies.shouldUseLocalNodeModules', false);
  const shouldIgnoreLocalPackageJsonDependencies = lodash.get(serverless.service.custom, 'serverless-plugin-include-dependencies.shouldIgnorePackageJsonDependencies', false);
  const baseDirPackageJsonObject = shouldIgnoreLocalPackageJsonDependencies ? JSON.parse(fs.readFileSync(path.join(servicePath, "package.json")).toString()) : undefined;

  function isModuleContainedInLocalPackageJSonDependencies(moduleName) {
    console.log(`[serverless-plugin-include-dependencies]: going to check if module ${moduleName} is in package.json so it can be ignored`);
    for(const key of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
      const dependencies = baseDirPackageJsonObject[key];

      if (dependencies && Object.keys(dependencies).includes(moduleName)) {
        return true;
      }
    }

    throw new Error(`[serverless-plugin-include-dependencies]: module ${moduleName} should be ignored, but could not be found in package json...`);
  }

  function handle(name, basedir, optionalDependencies, peerDependenciesMeta) {
    const moduleName = requirePackageName(name.replace(/\\/, '/'));
    const cacheKey = `${basedir}:${name}`;

    if (cache && cache.has(cacheKey)) {
      return;
    }

    try {
      let pathToModule;
      let pkg;

      if (shouldIgnoreLocalPackageJsonDependencies && isModuleContainedInLocalPackageJSonDependencies(moduleName)) {
        return;
      }

      if (shouldUseLocalNodeModules) {
        pathToModule = path.join(basedir, 'node_modules', moduleName, 'package.json');
        const jsonFile = fs.readFileSync(pathToModule).toString();
        pkg = {
          packageJson: JSON.parse(jsonFile),
          path: pathToModule
        }
      } else {
        pathToModule = resolve.sync(path.join(moduleName, 'package.json'), { basedir });
        pkg = readPkgUp.sync({ cwd: pathToModule });
      }

      if (pkg) {
        modulesToProcess.push(pkg);

        if (cache) {
          cache.add(cacheKey);
        }
  
      } else {
        // TODO: should we warn here?
      }
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        if (ignoreMissing(moduleName, optionalDependencies, peerDependenciesMeta)) {
          serverless.cli.log(`[serverless-plugin-include-dependencies]: WARNING missing optional dependency: ${moduleName}`);
          return null;
        }
        try {
          // this resolves the requested import also against any set up NODE_PATH extensions, etc.
          const resolved = require.resolve(name);
          localFilesToProcess.push(resolved);

          if (cache) {
            cache.add(cacheKey);
          }

          return;
        } catch(e) {
          throw new Error(`[serverless-plugin-include-dependencies]: Could not find npm package: ${moduleName}`);
        }
      }
      throw e;
    }
  }

  while (localFilesToProcess.length) {
    const currentLocalFile = localFilesToProcess.pop();

    if (filePaths.has(currentLocalFile)) {
      continue;
    }

    filePaths.add(currentLocalFile);

    precinct.paperwork(currentLocalFile, { includeCore: false }).forEach(dependency => {
      if (dependency.indexOf('.') === 0) {
        const abs = resolve.sync(dependency, {
          basedir: path.dirname(currentLocalFile)
        });
        localFilesToProcess.push(abs);
      } else {
        handle(dependency, servicePath);
      }
    });
  }

  while (modulesToProcess.length) {
    const currentModule = modulesToProcess.pop();
    const currentModulePath = path.join(currentModule.path, '..');

    if (modulePaths.has(currentModulePath)) {
      continue;
    }

    modulePaths.add(currentModulePath);

    const { packageJson } = currentModule;

    ['dependencies', 'peerDependencies', 'optionalDependencies'].forEach(key => {
      const dependencies = packageJson[key];

      if (dependencies) {
        Object.keys(dependencies).forEach(dependency => {
          handle(dependency, currentModulePath, packageJson.optionalDependencies, packageJson.peerDependenciesMeta);
        });
      }
    });
  }

  modulePaths.forEach(modulePath => {
    const moduleFilePaths = glob.sync(path.join(modulePath, '**'), {
      nodir: true,
      ignore: path.join(modulePath, 'node_modules', '**'),
      absolute: true
    });

    moduleFilePaths.forEach(moduleFilePath => {
      filePaths.add(moduleFilePath);
    });
  });

  console.info(`[serverless-plugin-include-dependencies]: file paths are - ${JSON.stringify(filePaths)}`);
  serverless.cli.info(`[serverless-plugin-include-dependencies]: file paths are - ${JSON.stringify(filePaths)}`);
  serverless.cli.log(`[serverless-plugin-include-dependencies]: file paths are - ${JSON.stringify(filePaths)}`);

  return Array.from(filePaths);
};
