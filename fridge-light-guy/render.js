// Usage: node render.js <outDir> <fps> <start> <end> [port]   (frame indices, end exclusive)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [out, fps, a, b, port = 8765] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('PAGE:', m.text()); });
  page.on('pageerror', e => console.error('PAGEERR:', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
  for (let f = +a; f < +b; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / +fps);
    await page.screenshot({ path: `${out}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 94 });
  }
  await browser.close();
})();
