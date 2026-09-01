import dts from "vite-plugin-dts";
import babel from "vite-plugin-babel";

import { playwright } from "@vitest/browser-playwright";

const builds = {
  default: {
    plugins: [
      dts({
        tsconfigPath: "./lib/tsconfig.json",
        outDirs: "dist/types",
      }),
    ],
    build: {
      emptyOutDir: true,
      rolldownOptions: {
        external: ["@html-extras/core"],
        output: [
          {
            format: "es",
            entryFileNames: "lib/[name].js",
            preserveModules: true,
            preserveModulesRoot: "lib",
            minify: false,
          },
        ],
      },
    },
  },
  cdn: {
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      rolldownOptions: {
        external: ["@html-extras/core"],
        output: [
          {
            dir: "dist/cdn",
            format: "es",
            entryFileNames: "index.esm.js",
            minify: true,
          },
        ],
      },
    },
  },
  "cdn-standalone": {
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      emptyOutDir: false,
      copyPublicDir: false,
      rolldownOptions: {
        output: [
          {
            dir: "dist/cdn",
            format: "es",
            entryFileNames: "index.standalone.esm.js",
            minify: true,
          },
        ],
      },
    },
  },
};

/**
 * @type {import('vite').UserConfigFn}
 *
 * @see https://vite.dev/config/
 * @see https://vitest.dev/config/
 * @see https://github.com/qmhc/unplugin-dts
 */
export default ({ mode }) => {
  const config = builds[mode] ?? builds.default;
  return {
    plugins: [
      babel({
        enforce: "pre",
        include: /\.tsx?(\?|$)/,
        babelConfig: {
          sourceMaps: true,
          plugins: [
            [
              "@babel/plugin-transform-typescript",
              { onlyRemoveTypeImports: true, allowDeclareFields: true },
            ],
            ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
          ],
        },
      }),
      ...(config.plugins ?? []),
    ],
    define: config.define,
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      dir: "test",
      passWithNoTests: true,
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }, { browser: "firefox" }],
      },
      coverage: {
        enabled: true,
        provider: "istanbul",
        include: ["lib/**/*.ts"],
        thresholds: {
          statements: 97,
          branches: 98,
          functions: 88,
          lines: 98,
        },
        reporter: "text",
      },
    },
    build: {
      outDir: "dist",
      lib: {
        entry: "./lib/index.ts",
      },
      ...config.build,
    },
  };
};
