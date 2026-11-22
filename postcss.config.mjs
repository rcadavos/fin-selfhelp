import path from "node:path";

/**
 * Turns px type into rem so the Aa text-size setting reaches it (see the plugin file).
 * The path is absolute because Turbopack `require`s a plugin name from inside its
 * build output, where a relative path does not resolve. webpack accepts either.
 */
const remFontSizes = path.join(process.cwd(), "scripts", "postcss-rem-font-sizes.cjs");

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    [remFontSizes]: {},
  },
};

export default config;
