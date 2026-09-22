import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import publicBackend from "./config/public-backend.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const get = (key: string) => process.env[key] ?? env[key];

  const url = get("VITE_SUPABASE_URL");
  const key = get("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (Boolean(url) !== Boolean(key)) throw new Error("Set both public backend environment variables together.");
  const resolved = {
    VITE_SUPABASE_URL: url || publicBackend.url,
    VITE_SUPABASE_PUBLISHABLE_KEY: key || publicBackend.publishableKey,
  };

  // Build-time safety: forks/self-hosters must provide their own backend env vars.
  if (mode !== "development") {
    const missing = Object.entries(resolved)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}.\n` +
          `Copy .env.example to .env and fill in your Supabase project values.`,
      );
    }
  }


  return {
    define: Object.fromEntries(Object.entries(resolved).map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)])),
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: "es2020",
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-tabs",
              "@radix-ui/react-select",
            ],
            "vendor-tiptap": [
              "@tiptap/react",
              "@tiptap/starter-kit",
              "@tiptap/extension-link",
              "@tiptap/extension-image",
            ],
            "vendor-query": ["@tanstack/react-query"],
          },
        },
      },
    },
  };
});
