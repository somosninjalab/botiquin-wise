import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";

const bundled = await bundle({
  entryPoint: path.resolve("remotion-video/src/index.ts"),
  webpackOverride: (c) => c,
});
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});
const c = await selectComposition({ serveUrl: bundled, id: "dynamic", puppeteerInstance: browser });
await renderMedia({
  composition: c, serveUrl: bundled, codec: "h264",
  outputLocation: "/mnt/documents/alerta-medicina-dynamic-9x16.mp4",
  puppeteerInstance: browser, muted: true, concurrency: 1,
});
await browser.close({ silent: false });
console.log("DONE");
