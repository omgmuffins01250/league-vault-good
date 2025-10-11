import { readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

let esbuildModulePromise;

async function loadEsbuildModule() {
  if (esbuildModulePromise) return esbuildModulePromise;
  const pnpmDir = new URL("./node_modules/.pnpm/", import.meta.url);
  const entries = await readdir(pnpmDir, { withFileTypes: true });
  const entry = entries.find((dir) => dir.isDirectory() && dir.name.startsWith("esbuild@"));
  if (!entry) {
    throw new Error("esbuild package not found in pnpm workspace");
  }
  const moduleUrl = new URL(`./${entry.name}/node_modules/esbuild/lib/main.js`, pnpmDir);
  esbuildModulePromise = import(moduleUrl.href);
  return esbuildModulePromise;
}

export async function load(url, context, defaultLoad) {
  const extension = extname(url);
  if (extension === ".ts" || extension === ".tsx") {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, "utf8");
    const { transform } = await loadEsbuildModule();
    const { code } = await transform(source, {
      loader: extension === ".tsx" ? "tsx" : "ts",
      format: "esm",
      target: "es2020",
      sourcemap: "inline",
    });
    return { format: "module", source: code, shortCircuit: true };
  }

  if (extension === "") {
    return defaultLoad(url, context, defaultLoad);
  }

  return defaultLoad(url, context, defaultLoad);
}
