// node montage.js out.png cols img1 img2 ... → grade de imagens
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const [out, cols, ...imgs] = process.argv.slice(2);
  const c = +cols || 2;
  const html = '<html><body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(' + c + ',1fr);gap:2px;width:1600px">' +
    imgs.map((i) => '<div style="position:relative"><img style="width:100%;display:block" src="file://' + path.resolve(i) + '"><span style="position:absolute;left:4px;top:2px;color:#fff;font:12px monospace;background:#0008">' + path.basename(i) + '</span></div>').join('') + '</body></html>';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const tmp = path.resolve(out) + '.html';
  require('fs').writeFileSync(tmp, html);
  await p.goto('file://' + tmp);
  await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
