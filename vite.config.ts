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

  const get = (key: string) => env[key] ?? envFile[key] ?? process.env[key];

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // These are public values (URL + publishable key). They must exist at runtime.
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(get("VITE_SUPABASE_URL")),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(get("VITE_SUPABASE_PUBLISHABLE_KEY")),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(get("VITE_SUPABASE_PROJECT_ID")),
    },
  };
});

