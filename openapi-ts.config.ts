// No runtime imports — jiti (used by @hey-api/openapi-ts to load this file)
// runs in CJS mode here and the package's exports map has no `require`
// condition for the main entry, so `import { defineConfig } from ...` blows
// up with ERR_PACKAGE_PATH_NOT_EXPORTED. The plain object below is what
// `defineConfig` would have returned anyway.

/** @type {import('@hey-api/openapi-ts').UserConfig} */
export default {
  input: './oapi/api.yaml',
  output: {
    path: './src',
    format: false,
    lint: false,
  },
  plugins: [
    { name: '@hey-api/client-fetch' },
    { name: '@hey-api/typescript' },
    { name: '@hey-api/sdk' },
  ],
};
