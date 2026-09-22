const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
// The only code outside this independent app is a framework-free local package.
config.watchFolders = [path.resolve(__dirname, '../../packages/public-feed')];
module.exports = config;
