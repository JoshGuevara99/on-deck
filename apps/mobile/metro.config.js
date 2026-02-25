const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro can resolve @on-deck/shared
config.watchFolders = [workspaceRoot];

// Resolve modules from the app's node_modules first, then the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Follow symlinks so workspace package links resolve correctly
config.resolver.unstable_enableSymlinks = true;

// With pnpm hoisting, dependencies live in the workspace root's node_modules.
// Expo's web server generates entry bundle URLs like /node_modules/expo-router/entry,
// which Metro treats as relative paths (./node_modules/...) from the project root —
// but those packages don't exist there. Strip the prefix so Metro treats them as
// bare module names and finds them via nodeModulesPaths above.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('./node_modules/') || moduleName.startsWith('/node_modules/')) {
    const bareModule = moduleName.replace(/^\.?\/node_modules\//, '');
    return context.resolveRequest(context, bareModule, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
