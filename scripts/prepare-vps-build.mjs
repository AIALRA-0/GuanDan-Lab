import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const serverDir = resolve("dist/server");
const wranglerPath = resolve(serverDir, "wrangler.json");
const manifestPath = resolve(serverDir, "__vite_rsc_assets_manifest.js");

const wrangler = JSON.parse(await readFile(wranglerPath, "utf8"));
wrangler.no_bundle = false;
await writeFile(wranglerPath, `${JSON.stringify(wrangler)}\n`, "utf8");

const manifest = await readFile(manifestPath, "utf8");
if (!manifest.endsWith("\n")) {
  await writeFile(manifestPath, `${manifest}\n`, "utf8");
}

console.log("Prepared bundled VPS Worker artifact");
