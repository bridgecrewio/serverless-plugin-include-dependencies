'use strict';

const path = require('path');
const test = require('ava');
const sinon = require('sinon')

const getDependencyList = require('../get-dependency-list.js');

const serverless = {
  config: {
    servicePath: path.join(__dirname, 'fixtures')
  }
};

test('includes a deep dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('handles relative/project dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'other', 'other-thing.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('should include local files', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'other', 'other-thing.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => path.basename(item) === 'other-thing.js'));
  t.true(list.some(item => path.basename(item) === 'thing.js'));
});

test('should include packages with no main', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'babel.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => path.basename(item) === 'babel.js'));
  t.true(list.some(item => item.match(/babel-runtime/)));
  t.true(list.some(item => item.match(/babel-polyfill/)));
});

test('handles requiring dependency file', (t) => {
	const fileName = path.join(__dirname, 'fixtures', 'dep-file.js');

	const list = getDependencyList(fileName, serverless);

	t.true(list.some(item => item.match(/test-dep/)));
});

test('handles requiring dependency file in scoped package', (t) => {
	const fileName = path.join(__dirname, 'fixtures', 'scoped-dep-file.js');

	const list = getDependencyList(fileName, serverless);

	t.true(list.some(item => item.indexOf(`@test/scoped-dep`) !== -1));
});

test('should handle requires with same relative path but different absolute path', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'same-relative-require.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => item.indexOf(`bar/baz.js`) !== -1));
  t.true(list.some(item => item.indexOf(`foo/baz.js`) !== -1));
});

test('should handle requires to a missing optionalDependency listed in dependencies', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'optional-dep-missing.js');
  const log = sinon.stub();

  const list = getDependencyList(fileName, Object.assign({ cli: { log } }, serverless));

  t.true(list.some(item => item.indexOf(`optional-dep-missing.js`) !== -1));
  t.true(list.some(item => item.indexOf(`node_modules/optional-dep-parent/index.js`) !== -1));
  t.true(log.called);
});

test('should handle requires to a missing peerDependency listed in peerDependenciesMeta as optional', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'optional-dep-meta-missing.js');
  const log = sinon.stub();

  const list = getDependencyList(fileName, Object.assign({ cli: { log } }, serverless));

  t.true(list.some(item => item.indexOf(`optional-dep-meta-missing.js`) !== -1));
  t.true(list.some(item => item.indexOf(`node_modules/optional-dep-meta-parent/index.js`) !== -1));
  t.true(log.called);
});

test('includes a dependency with peerDependencies', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'dep-with-peer.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => item.match(/test-dep.js/)));
  t.true(list.some(item => item.match(/dep-with-peer/)));
});

test('throws on missing peerDependencies', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'dep-missing-peer.js');

  const error = t.throws(() => getDependencyList(fileName, serverless));

  t.is(error.message, '[serverless-plugin-include-dependencies]: Could not find wont-find-me');
});

test('understands local named dependencies', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'dep-local-named.js');

  const list = getDependencyList(fileName, serverless);

  t.true(list.some(item => item.endsWith('dep-local-named.js')));
  t.true(list.some(item => item.endsWith('local/named/index.js')));
});

// test sls extractions - shouldUseLocalNodeModules and shouldIgnoreLocalPackageJsonDependencies

test('serverless is null - expect to throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'dep-missing-peer.js');
  const error = t.throws(() => getDependencyList(fileName, null));
  t.is(error.message, 'Cannot read property \'config\' of null');
});

test('serverless is undefined - expect to throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'dep-missing-peer.js');
  const error = t.throws(() => getDependencyList(fileName, undefined));
  t.is(error.message, 'Cannot read property \'config\' of undefined');
});

test('serverless is empty - expect to throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'dep-missing-peer.js');
  const error = t.throws(() => getDependencyList(fileName, null));
  t.is(error.message, 'Cannot read property \'config\' of null');
});

test('serverless service is empty - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless service custom is empty - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: {}};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless service custom is null - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: null};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless service custom is undefined - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: undefined};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless service serverless-plugin-include-dependencies is empty - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: {"serverless-plugin-include-dependencies": {}}};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless service serverless-plugin-include-dependencies is null - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: {"serverless-plugin-include-dependencies": null}};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless service serverless-plugin-include-dependencies is undefined - should define false default values and include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: {"serverless-plugin-include-dependencies": undefined}};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless shouldUseLocalNodeModules is false - should include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: {"serverless-plugin-include-dependencies": {shouldUseLocalNodeModules: false}}};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

test('serverless shouldIgnorePackageJsonDependencies is false - should include a dependency', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'thing.js');

  const localServerless = serverless;
  localServerless['service'] = {custom: {"serverless-plugin-include-dependencies": {shouldIgnorePackageJsonDependencies: false}}};
  const list = getDependencyList(fileName, localServerless);

  t.true(list.some(item => item.match(/jwa/)));
});

// shouldUseLocalNodeModules is true

test('serverless shouldIgnorePackageJsonDependencies is true - and dependency is included in local package.json - should be ignored', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'shouldUseLocalNodeModulesTest.js');
  const log = sinon.stub();

  const localServerless = {
    config: {
      servicePath: path.join(__dirname, '/../')
    },
    service: {custom: {"serverless-plugin-include-dependencies": {shouldIgnorePackageJsonDependencies: true}}}
  };
  const list = getDependencyList(fileName, Object.assign({cli: {log}}, localServerless));

  t.true(list.length === 1);
  t.true(list[0] === fileName);
  t.true(log.called);
  t.true(log.callCount === 1);
  t.true(log.args[0][0] === '[serverless-plugin-include-dependencies]: going to check if module glob is in package.json so it can be ignored');
});

test('serverless shouldIgnorePackageJsonDependencies is true - but dependencies are empty should throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'shouldUseLocalNodeModulesTest.js');

  const localServerless = {
    config: {
      servicePath: path.join(__dirname, '/fixtures/no_dependencies/empty_dependencies')
    },
    service: {custom: {"serverless-plugin-include-dependencies": {shouldIgnorePackageJsonDependencies: true}}}
  };

  const error = t.throws(() => getDependencyList(fileName, Object.assign({cli: {log: sinon.stub()}}, localServerless)));
  t.is(error.message, '[serverless-plugin-include-dependencies]: module glob should be ignored, but could not be found in package json...');
});

test('serverless shouldIgnorePackageJsonDependencies is true - but dependencies are null should throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'shouldUseLocalNodeModulesTest.js');

  const localServerless = {
    config: {
      servicePath: path.join(__dirname, '/fixtures/no_dependencies/null_dependencies')
    },
    service: {custom: {"serverless-plugin-include-dependencies": {shouldIgnorePackageJsonDependencies: true}}}
  };

  const error = t.throws(() => getDependencyList(fileName, Object.assign({cli: {log: sinon.stub()}}, localServerless)));
  t.is(error.message, '[serverless-plugin-include-dependencies]: module glob should be ignored, but could not be found in package json...');
});

test('serverless shouldIgnorePackageJsonDependencies is true - but dependency is not in package.json - should throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'shouldUseLocalNodeModulesAndThrowExceptionTest.js');

  const localServerless = {
    config: {
      servicePath: path.join(__dirname, '/../')
    },
    service: {custom: {"serverless-plugin-include-dependencies": {shouldIgnorePackageJsonDependencies: true}}}
  };

  const error = t.throws(() => getDependencyList(fileName, Object.assign({cli: {log: sinon.stub()}}, localServerless)));
  t.is(error.message, '[serverless-plugin-include-dependencies]: module ava should be ignored, but could not be found in package json...');
});

// shouldUseLocalNodeModules

test('serverless shouldUseLocalNodeModules is true - and dependency is included in local package.json', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'shouldUseLocalNodeModulesTest.js');
  const log = sinon.stub();

  const localServerless = {
    config: {
      servicePath: path.join(__dirname, '/../')
    },
    service: {custom: {"serverless-plugin-include-dependencies": {shouldUseLocalNodeModules: true}}}
  };
  const list = getDependencyList(fileName, Object.assign({cli: {log}}, localServerless));

  t.true(list.some(item => item === `${path.join(__dirname, '/../')}node_modules/glob/package.json`));
});

test('serverless shouldUseLocalNodeModules is true - but dependency is not in local package.json - should throw exception', (t) => {
  const fileName = path.join(__dirname, 'fixtures', 'shouldUseLocalNodeModulesAndThrowExceptionTest.js');

  const localServerless = {
    config: {
      servicePath: path.join(__dirname, '/../')
    },
    service: {custom: {"serverless-plugin-include-dependencies": {shouldUseLocalNodeModules: true}}}
  };

  const error = t.throws(() => getDependencyList(fileName, Object.assign({cli: {log: sinon.stub()}}, localServerless)));
  t.true(error.message.startsWith('ENOENT: no such file or directory'));
});