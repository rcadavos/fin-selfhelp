const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// `@shared/*` (see tsconfig.json) resolves to the web app's `src/lib/shared`, which sits
// outside this project — Metro only bundles files inside its watch folders.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../src/lib/shared")];

module.exports = withNativeWind(config, { input: "./src/global.css" });
