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
      // Strip surrounding quotes
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
  // Lovable environments can sometimes miss inlining `import.meta.env`.
  // We load env normally and also fall back to parsing the root `.env` file.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envFile = parseDotEnvFile(path.resolve(process.cwd(), ".env"));

  // Last-resort fallbacks to keep the app from blank-screening if env injection fails.
  // These values are public (URL + publishable key) and are already required client-side.
  const FALLBACKS: Record<string, string> = {
    VITE_SUPABASE_PROJECT_ID: "anknmcmqljejabxbeohv",
    VITE_SUPABASE_URL: "https://anknmcmqljejabxbeohv.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFua25tY21xbGplamFieGJlb2h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTM5MTUsImV4cCI6MjA4MzA2OTkxNX0.IWsUxLhvANU4e9TDUuJ0lTHZda0yqYILU_4_rtJfnMU",
  };

  const get = (key: string) => env[key] ?? envFile[key] ?? process.env[key] ?? FALLBACKS[key];

  const resolved = {
    VITE_SUPABASE_URL: get("VITE_SUPABASE_URL"),
    VITE_SUPABASE_PUBLISHABLE_KEY: get("VITE_SUPABASE_PUBLISHABLE_KEY"),
    VITE_SUPABASE_PROJECT_ID: get("VITE_SUPABASE_PROJECT_ID"),
  };

  // Hard replacement plugin: guarantees `import.meta.env.VITE_*` are inlined in ALL source modules
  // (including the auto-generated supabase client), even if env injection is flaky.
  const inlineLovableEnv = () => ({
    name: "inline-lovable-env",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!id.includes("/src/") && !id.includes("\\src\\")) return null;

      let out = code;
      for (const [k, v] of Object.entries(resolved)) {
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
  };
});


