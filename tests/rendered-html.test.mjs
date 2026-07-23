import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("生产产物包含完整中文训练平台", async () => {
  const assetRoot = new URL("../dist/client/assets/", import.meta.url);
  const files = await readdir(assetRoot);
  const javascriptFiles = files.filter((file) => file.endsWith(".js"));
  const cssFiles = files.filter((file) => file.endsWith(".css"));
  const javascript = (
    await Promise.all(
      javascriptFiles.map((file) =>
        readFile(new URL(file, assetRoot), "utf8")
      )
    )
  ).join("\n");
  const css = (
    await Promise.all(
      cssFiles.map((file) => readFile(new URL(file, assetRoot), "utf8"))
    )
  ).join("\n");
  const server = await readFile(
    new URL("../dist/server/index.js", import.meta.url),
    "utf8"
  );

  assert.ok(javascriptFiles.length > 0);
  assert.ok(cssFiles.length > 0);
  assert.match(javascript, /每一手都讲清楚为什么/);
  assert.match(javascript, /专项训练/);
  assert.match(javascript, /规则实验室/);
  assert.match(css, /\.game-table/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(server, /vinext/);
  assert.doesNotMatch(
    `${javascript}\n${css}`,
    /Your site is taking shape|react-loading-skeleton/
  );
});
