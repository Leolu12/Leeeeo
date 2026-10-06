// Smoke test da versão de teste: tela inicial → Novo jogo → preparação → começa o prólogo.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = '/tmp/claude-0/-home-user-Leeeeo/7293cc00-7428-51ca-a23f-ac6d06631493/scratchpad';
(async () => {
  const mobile = process.argv.includes('--mobile');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, hasTouch: mobile, isMobile: mobile });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts\.g|net::/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + S + '/preview/_test.html?q=low');
  await p.waitForTimeout(6000);
  await p.screenshot({ path: S + '/pro/smoke-title' + (mobile ? '-m' : '') + '.png', timeout: 120000 });
  const clickText = async (re) => p.evaluate((src) => { const r = new RegExp(src, 'i'); const b = Array.from(document.querySelectorAll('button')).find(x => r.test(x.textContent) && x.offsetParent !== null); if (b) { b.click(); return b.textContent.trim(); } return null; }, re);
  console.log('1', await clickText('começar'));
  await p.waitForTimeout(2500);
  const inputs = await p.$$('#screen input[type=text], #screen input:not([type])');
  console.log('inputs', inputs.length);
  if (inputs[0]) await inputs[0].fill('Roberto');
  if (inputs[2]) await inputs[2].fill('Leo');
  await p.screenshot({ path: S + '/pro/smoke-setup' + (mobile ? '-m' : '') + '.png', timeout: 120000 });
  console.log('2', await clickText('^\\s*pronto'));
  await p.waitForTimeout(3000);
  await p.screenshot({ path: S + '/pro/smoke-handoff' + (mobile ? '-m' : '') + '.png', timeout: 120000 });
  console.log('3', await clickText('vamos começar'));
  await p.waitForTimeout(15000);
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(1500); }
  await p.screenshot({ path: S + '/pro/smoke-play' + (mobile ? '-m' : '') + '.png', timeout: 120000 });
  const st = await p.evaluate(() => ({ running: !!(P2.director.running && P2.director.running()), label: document.querySelector('#chap-label').textContent, text: document.querySelector('#dlg-text').textContent.slice(0, 80) }));
  console.log(JSON.stringify({ st, errs }));
  await b.close();
})();
