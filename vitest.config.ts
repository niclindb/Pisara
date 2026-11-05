import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    // Database tests share one database, so run files one at a time.
    fileParallelism: false,
  },
});
