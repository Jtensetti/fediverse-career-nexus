import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { componentTagger } from "lovable-tagger";

function parseDotEnvFile(filePath: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const out: Record<string, string> = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }

    return out;
  } catch {
    return {};
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from process and the local .env file as a fallback (Lovable injects these automatically).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envFile = parseDotEnvFile(path.resolve(process.cwd(), ".env"));

  const get = (key: string) => env[key] ?? envFile[key] ?? process.env[key];

  const resolved = {
    VITE_SUPABASE_URL: get("VITE_SUPABASE_URL"),
    VITE_SUPABASE_PUBLISHABLE_KEY: get("VITE_SUPABASE_PUBLISHABLE_KEY"),
    VITE_SUPABASE_PROJECT_ID: get("VITE_SUPABASE_PROJECT_ID"),
  };

  // Build-time safety: forks/self-hosters must provide their own backend env vars.
  // On Lovable hosting these are always injected, so this never trips in production.
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

  // Hard replacement plugin: guarantees `import.meta.env.VITE_*` are inlined in ALL source modules
  // (including the auto-generated supabase client), even if env injection is flaky.
  const inlineLovableEnv = () => ({
    name: "inline-lovable-env",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!id.includes("/src/") && !id.includes("\\src\\")) return null;

      let out = code;
      for (const [k, v] of Object.entries(resolved)) {
        if (v === undefined) continue;
        const needle = `import.meta.env.${k}`;
        if (out.includes(needle)) out = out.split(needle).join(JSON.stringify(v));
      }

      if (out === code) return null;
      return { code: out, map: null };
    },
  });

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [inlineLovableEnv(), react(), mode === "development" && componentTagger()].filter(Boolean),
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
            "vendor-charts": ["recharts"],
            "vendor-query": ["@tanstack/react-query"],
          },
        },
      },
    },
  };
});
