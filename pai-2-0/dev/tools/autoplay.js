// Autojogo do PAI 2.0 — joga um capítulo do começo ao fim com heurísticas.
// Uso: node autoplay.js <capId> [prof=escritorio] [--mobile] [--filha] [--shots=DIR] [--pick=first|random|last] [--max=1500]
// Sai com código 0 se chegou ao cartão "Capítulo concluído" (ou ao título no epílogo) sem erros.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const cap = args[0] || 'prologo';
const prof = (args[1] && !args[1].startsWith('--')) ? args[1] : 'escritorio';
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k)); if (!a) return d; const v = a.split('=')[1]; return v === undefined ? true : v; };
const mobile = opt('mobile', false), filha = opt('filha', false);
const shots = opt('shots', null), pick = opt('pick', 'first'), MAX = +opt('max', 8000);
const GAME = '/home/user/Leeeeo/pai-2-0/index.html';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 } });
  const errs = [];
  p.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/ERR_CERT|fonts\.g|ERR_NAME|net::/.test(t)) errs.push(m.type() + ': ' + t); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  if (shots) fs.mkdirSync(shots, { recursive: true });
  let shotN = 0;
  const shot = async (tag) => { if (!shots) return; try { await p.screenshot({ path: path.join(shots, String(shotN++).padStart(3, '0') + '-' + tag + '.png'), timeout: 90000 }); } catch (e) { console.error('screenshot falhou (' + tag + '): ' + e.message.split('\n')[0]); } };
  await p.goto('file://' + GAME + '?cap=' + cap + '&speed=instantanea' + (opt('hq', false) ? '' : '&q=low') + (filha ? '&genero=filha' : ''), { timeout: 300000 });
  await p.waitForTimeout(800);
  let done = false, steps = 0, stuck = 0, lastSig = '', modes = {}, lastChange = Date.now(), noGo = 0;
  const texts = [];
  while (steps++ < MAX) {
    const st = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const modal = !q('#modal').hidden && q('#modal').innerHTML !== '';
      const overlay = !q('#overlay').hidden && q('#overlay').innerHTML !== '';
      const kicker = modal ? (q('#modal .card-kicker') || {}).textContent : '';
      return { mode: q('#panel').dataset.mode, modal, overlay, kicker, title: (q('#chap-label') || {}).textContent,
        text: (q('#dlg-text') || {}).textContent, name: (q('#dlg-name') || {}).textContent,
        stageOv: !q('#stage-overlay').hidden, running: !!(window.P2 && P2.director.running()),
        sig: q('#panel').innerText.slice(0, 200) + '|' + (modal ? q('#modal').innerText.slice(0, 100) : '') + '|' + (overlay ? q('#overlay').innerText.slice(0, 100) : '') };
    });
    modes[st.mode] = (modes[st.mode] || 0) + 1;
    // travado = a tela não mudou por 60 s de relógio (máquinas lentas fazem os fades demorarem)
    if (st.sig === lastSig) stuck++; else { stuck = 0; lastSig = st.sig; lastChange = Date.now(); }
    if (stuck > 25 && Date.now() - lastChange > 180000) { errs.push('STUCK at mode=' + st.mode + ' modal=' + st.modal + ' overlay=' + st.overlay + ' sig=' + st.sig.slice(0, 160)); await shot('stuck'); break; }
    if (st.modal && /Capítulo concluído/i.test(st.kicker || '')) { done = true; await shot('done'); break; }
    if (st.mode === 'menuPanel' && !st.running && steps > 5) { done = cap === 'epilogo'; if (!done) errs.push('Returned to title unexpectedly'); await shot('title'); break; }
    if (st.modal && /Ops/i.test(st.kicker || '')) { errs.push('Chapter error card: ' + await p.evaluate(() => document.querySelector('#modal').innerText)); await shot('error'); break; }
    if (st.modal) {
      if (steps % 7 === 0) await shot('modal');
      const clicked = await p.evaluate(() => { const bs = Array.from(document.querySelectorAll('#modal .card-actions button')).filter(b => !b.disabled); const b = bs.find(x => x.classList.contains('primary')) || bs[bs.length - 1]; if (b) { b.click(); return true; } return false; });
      await p.waitForTimeout(clicked ? 520 : 200); continue;
    }
    if (st.overlay) {
      if (steps % 5 === 0) await shot('overlay');
      await p.evaluate((pick) => {
        const all = Array.from(document.querySelectorAll('#overlay button, #overlay [data-key]')).filter(b => !b.disabled && b.offsetParent !== null);
        const prefer = all.filter(b => /continuar|pr[oó]ximo|fechar|pular|terminar|voltar ao|fim|seguir|ok/i.test(b.textContent));
        const list = prefer.length ? prefer : all;
        const b = pick === 'random' ? list[Math.floor(Math.random() * list.length)] : list[list.length - 1];
        if (b) b.click();
      }, pick);
      await p.waitForTimeout(400); continue;
    }
    if (st.stageOv) { await p.keyboard.press('Space'); await p.waitForTimeout(300); continue; }
    if (st.mode === 'choices') {
      if (steps % 4 === 0) await shot('choice');
      await p.waitForTimeout(420);
      // clica numa opção habilitada (há opções desativadas de propósito, ex.: "Já vimos onde isso dá")
      await p.evaluate((pick) => {
        const en = Array.from(document.querySelectorAll('#choices .choice')).filter((b) => !b.disabled);
        if (!en.length) return;
        const b = pick === 'random' ? en[Math.floor(Math.random() * en.length)] : pick === 'last' ? en[en.length - 1] : en[0];
        b.click();
      }, pick);
      await p.waitForTimeout(350); continue;
    }
    if (st.mode === 'chat') { await p.keyboard.press('Space'); await p.waitForTimeout(250); continue; }
    if (st.mode === 'mini') {
      if (steps % 6 === 0) await shot('mini');
      await p.evaluate((pick) => {
        const root = document.querySelector('#mini');
        const all = Array.from(root.querySelectorAll('button, [data-key], .mg-zone')).filter(b => !b.disabled && b.offsetParent !== null);
        if (!all.length) return;
        const primary = all.filter(b => b.classList.contains('primary'));
        let b;
        if (primary.length && Math.random() < 0.35) b = primary[0];
        else b = pick === 'first' ? all[Math.floor(Math.random() * Math.min(all.length, 3))] : all[Math.floor(Math.random() * all.length)];
        b.click();
      }, pick);
      await p.waitForTimeout(260); continue;
    }
    // exploração em primeira pessoa: usa "Ir até lá" ou clica num rótulo de ponto de interação
    const exploring = await p.evaluate(() => !!(window.P2 && P2.core.player && P2.core.player.canMove));
    if (exploring) {
      if (steps % 6 === 0) await shot('explore');
      const did = await p.evaluate((pick) => {
        const hs = Array.from(document.querySelectorAll('.hs')).filter((b) => b.style.display !== 'none');
        const opt = hs.filter((b) => b.classList.contains('opt'));
        if (pick === 'random' && opt.length && Math.random() < 0.5) { opt[0].click(); return 'opt'; }
        const go = document.querySelector('.hud-go');
        if (go) { go.click(); return 'go'; }
        const req = hs.filter((b) => !b.classList.contains('opt'));
        if (req.length) { req[0].click(); return 'hs'; }
        if (hs.length) { hs[0].click(); return 'hs-any'; }
        return null;
      }, pick);
      // só é erro se continuar explorando sem botão por 3 checagens seguidas (o pai pode ter acabado de chegar)
      if (!did) { noGo = (noGo || 0) + 1; if (noGo >= 3) { errs.push('Exploring but no hotspot/go button available'); noGo = 0; } } else noGo = 0;
      await p.waitForTimeout(2600);
      continue;
    }
    if (st.mode === 'dialog' && st.text) { const line = (st.name || '') + ': ' + st.text; if (texts[texts.length - 1] !== line) texts.push(line); }
    if (steps % 25 === 0) await shot('dlg');
    await p.keyboard.press('Space');
    await p.waitForTimeout(140);
  }
  if (!done && steps >= MAX) errs.push('MAX steps reached');
  const ok = done && errs.length === 0;
  console.log(JSON.stringify({ cap, prof, mobile: !!mobile, filha: !!filha, ok, done, steps, modes, errors: errs, lines: texts.length }, null, 1));
  if (opt('dump', false)) fs.writeFileSync(path.join(shots || '.', cap + '-' + prof + '-text.txt'), texts.join('\n'));
  await b.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
