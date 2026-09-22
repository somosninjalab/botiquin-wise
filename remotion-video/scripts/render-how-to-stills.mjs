import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serveUrl = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (config) => config });
const browser = await openBrowser("chrome", { browserExecutable: "/bin/chromium", chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] }, chromeMode: "chrome-for-testing" });
const composition = await selectComposition({ serveUrl, id: "how-to-use", puppeteerInstance: browser });
for (const frame of [34, 112, 205, 302, 405]) {
  await renderStill({ composition, serveUrl, output: `/tmp/howto-${frame}.png`, frame, puppeteerInstance: browser });
}
await browser.close({ silent: false });
