#!/usr/bin/env python3
"""Gera versões de arquivo único do jogo.

  dist/impostor-a-bordo.html  -> página completa, abre direto no navegador (offline, sem servidor)
  --fragment CAMINHO          -> também grava o conteúdo sem <html>/<head>/<body>,
                                 para hospedagens que injetam o esqueleto da página

Uso: python3 tools/build.py [--fragment saida.html]
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def inline_css(m):
        css = (ROOT / m.group(1)).read_text(encoding="utf-8")
        return "<style>\n" + css + "\n</style>"

    def inline_js(m):
        js = (ROOT / m.group(1)).read_text(encoding="utf-8")
        if "</script" in js:
            raise SystemExit(f"{m.group(1)} contém '</script' e não pode ser embutido")
        return "<script>\n" + js + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
    html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)

    DIST.mkdir(exist_ok=True)
    (DIST / "impostor-a-bordo.html").write_text(html, encoding="utf-8")

    print(f"dist/impostor-a-bordo.html: {len(html.encode()) / 1024:.0f} KB")

    if "--fragment" in sys.argv:
        out = pathlib.Path(sys.argv[sys.argv.index("--fragment") + 1])
        head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
        body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
        head = re.sub(r"<meta charset[^>]*>\s*", "", head)
        head = re.sub(r"<meta name=\"viewport\"[^>]*>\s*", "", head)
        out.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
        print(f"{out}: {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
