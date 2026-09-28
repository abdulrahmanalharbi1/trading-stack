const { open } = require('./harness');
const fs = require('fs'), path = require('path');
(async () => {
  const [a, b] = process.argv.slice(2).map(Number), FPS = 30;
  const out = path.join(__dirname, 'frames'); fs.mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await open(path.join(__dirname, 'index.html'));
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.__mg.seek(t), f / FPS);
    await page.screenshot({ path: path.join(out, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
    if ((f - a) % 250 === 0) console.log(`[${a}-${b}] frame ${f} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  console.log(`[${a}-${b}] done in ${((Date.now() - t0) / 1000).toFixed(0)}s`, errors.length ? errors : '');
  await browser.close();
})();
