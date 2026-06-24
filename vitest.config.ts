import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolve os paths "@/*" do tsconfig nativamente (sem plugin).
    tsconfigPaths: true,
    alias: {
      // `server-only` lança erro fora de Server Components; neutraliza nos testes.
      "server-only": fileURLToPath(
        new URL("./tests/setup/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
