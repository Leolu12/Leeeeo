#!/usr/bin/env python3
"""Empacota uma versão de teste do PAI 2.0 para publicar como Artifact.
Uso: python3 build-preview.py prologo cap1 cap2 ...   (capítulos a incluir)
Gera scratchpad/preview/ com pai-2-0.html (sem doctype/html/head/body), os
arquivos de apoio, _test.html (para testar localmente) e files.json (mapa
publicado → origem)."""
import json, os, re, shutil, subprocess, sys

GAME = os.environ.get('GAME', '/home/user/Leeeeo/pai-2-0')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'preview')
THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'

chapters = sys.argv[1:] or ['prologo']
src = open(os.path.join(GAME, 'index.html'), encoding='utf-8').read()

head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)</body>', src, re.S).group(1)
head = re.sub(r'\s*<meta charset="utf-8">', '', head)
head = re.sub(r'\s*<meta name="viewport"[^>]*>', '', head)

scripts = re.findall(r'<script src="([^"]+)"></script>', body)
keep = []
for s in scripts:
    if s.startswith('js/chapters/'):
        cid = os.path.basename(s)[:-3]
        if cid not in chapters:
            body = body.replace('<script src="%s"></script>' % s, '')
            continue
    keep.append(s)
body = body.replace('<script src="js/lib/three.min.js"></script>', '<script src="%s"></script>' % THREE_CDN)
body = re.sub(r'\n\s*\n\s*\n+', '\n\n', body)

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)
files = {'css/style.css': 'css/style.css'}
for s in keep:
    if s == 'js/lib/three.min.js':
        continue
    files[s] = s
bad = []
for pub, rel in files.items():
    dst = os.path.join(OUT, pub)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(os.path.join(GAME, rel), dst)
    if pub.endswith('.js'):
        r = subprocess.run(['node', '-e', "new (require('vm').Script)(require('fs').readFileSync(process.argv[1],'utf8'))", dst], capture_output=True, text=True)
        if r.returncode:
            bad.append(pub + ': ' + r.stderr.strip().splitlines()[-1] if r.stderr.strip() else pub)

page = head.strip() + '\n' + body.strip() + '\n'
open(os.path.join(OUT, 'pai-2-0.html'), 'w', encoding='utf-8').write(page)
test = ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
        + page.replace(THREE_CDN, os.path.join(GAME, 'js/lib/three.min.js')) + '</html>')
open(os.path.join(OUT, '_test.html'), 'w', encoding='utf-8').write(test)
json.dump({k: os.path.join(OUT, k) for k in files}, open(os.path.join(OUT, 'files.json'), 'w'), indent=1)
print(json.dumps({'chapters': chapters, 'files': len(files), 'syntaxErrors': bad, 'bytes': sum(os.path.getsize(os.path.join(OUT, k)) for k in files) + len(page)}))
