import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleNodeGoogleSheetSync } from "./server/google-sheet-sync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function googleSheetSyncDevPlugin() {
  const routeHandler = async (req, res, next) => {
    if (!req.url?.startsWith("/api/google-sheet-sync")) {
      next();
      return;
    }
    await handleNodeGoogleSheetSync(req, res);
  };

  return {
    name: "google-sheet-sync-dev-plugin",
    configureServer(server) {
      server.middlewares.use(routeHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(routeHandler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), googleSheetSyncDevPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
