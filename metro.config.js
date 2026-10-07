const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permite a Metro Bundler leer archivos WebAssembly (.wasm) necesarios para expo-sqlite en Web
config.resolver.assetExts.push('wasm');

module.exports = config;
