import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Source files use NodeNext ".js" import specifiers; map them back to .ts.
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" }],
  },
  test: {
    globalSetup: "./test/global-setup.ts",
    setupFiles: ["./test/setup-env.ts"],
    fileParallelism: false, // tests share one SQLite database
    testTimeout: 20_000,
  },
});
