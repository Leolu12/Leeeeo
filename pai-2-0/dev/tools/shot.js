const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p = await b.newPage({viewport:{width:1280,height:720}});
  const errs=[]; p.on('console', m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.text()); }); p.on('pageerror', e=>errs.push('PE '+e.message));
  const q = process.argv[2]||''; const out = process.argv[3]||'s.png';
  await p.goto('file://'+__dirname+'/test.html?'+q);
  await p.waitForTimeout(+(process.argv[4]||2500));
  await p.screenshot({path: out});
  console.log(errs.slice(0,8).join('\n'));
  await b.close();
})();
