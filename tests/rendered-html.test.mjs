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
  assert.match(javascript, /交互教练/);
  assert.match(javascript, /训练透视/);
  assert.match(javascript, /对局历史/);
  assert.match(javascript, /出牌节奏/);
  assert.match(javascript, /为什么这样结算/);
  assert.match(javascript, /已知信息/);
  assert.match(javascript, /复盘本局/);
  assert.match(css, /\.game-table/);
  assert.match(css, /\.vision-drawer/);
  assert.match(css, /\.history-list/);
  assert.match(css, /\.action-announcer/);
  assert.match(css, /\.quiz-reasoning/);
  assert.match(css, /\.card-face\.is-selected:{1,2}after/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(server, /vinext/);
  assert.doesNotMatch(
    `${javascript}\n${css}`,
    /Your site is taking shape|react-loading-skeleton/
  );
});
