// shared Playwright page setup: skeleton wrap like the Artifact host + local asset routing
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const SP = __dirname, A = path.join(SP, 'assets');
async function open(file, query = '?render') {
  const html = fs.readFileSync(file, 'utf8');
  const wrapped = '<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>' + html + '</html>';
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('http://mg.local/')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: wrapped });
    if (u.includes('cdnjs.cloudflare.com') && u.includes('gsap')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(A, 'gsap.min.js')) });
    if (u.includes('fonts.googleapis.com')) {
      let css = fs.readFileSync(path.join(A, 'fonts.css'), 'utf8');
      return route.fulfill({ status: 200, contentType: 'text/css', body: css });
    }
    if (u.includes('fonts.gstatic.com')) {
      const f = path.join(A, 'fonts', u.replace('https://fonts.gstatic.com/', '').replace(/\//g, '_'));
      return route.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) });
    }
    return route.abort();
  });
  await page.goto('http://mg.local/' + query);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__mg.frame(); });
  return { browser, page, errors };
}
module.exports = { open };
