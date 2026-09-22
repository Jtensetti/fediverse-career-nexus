import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const get = (key: string) => process.env[key] ?? env[key];

  const resolved = {
    VITE_SUPABASE_URL: get("VITE_SUPABASE_URL"),
    VITE_SUPABASE_PUBLISHABLE_KEY: get("VITE_SUPABASE_PUBLISHABLE_KEY"),
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
