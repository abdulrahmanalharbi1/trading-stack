const { open } = require('./harness');
const fs = require('fs'), path = require('path');
(async () => {
  const times = (process.argv[2] || '').split(',').filter(Boolean).map(Number);
  const outDir = process.argv[3] || path.join(__dirname, 'probe');
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page, errors } = await open(path.join(__dirname, 'index.html'));
  const cues = await page.evaluate(() => window.__mg.cues);
  fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(cues));
  const fontsOk = await page.evaluate(() => ['800 40px Alexandria', '500 20px "IBM Plex Sans Arabic"', '500 16px "IBM Plex Mono"'].map(f => document.fonts.check(f)));
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.__mg.seek(t), times[i]);
    await page.screenshot({ path: path.join(outDir, `p${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
  console.log('cues', cues.length, 'fonts', fontsOk, 'errors', errors);
  await browser.close();
})();
