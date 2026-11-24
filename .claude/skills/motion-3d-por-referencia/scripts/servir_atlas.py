#!/usr/bin/env python3
"""Serve a pasta do atlas em http://localhost e abre no navegador.

Abrir o index.html direto (file://) falha em alguns Macs: o navegador recebe só a página e não tem permissão
para ler os vídeos e capas ao lado (tela preta, 0:00, play apagado). Por HTTP os vídeos tocam sempre.

    servir_atlas.py PASTA [--sem-abrir]
Reusa o servidor se já houver um dessa pasta; encerra sozinho após 6 horas.
"""
import functools
import http.server
import json
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from pathlib import Path

HORAS = 6


class H(http.server.SimpleHTTPRequestHandler):
    """Servidor estático com suporte a Range (Safari e a busca no vídeo exigem)."""
    _faixa = None

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        caminho = self.translate_path(self.path)
        if not rng or not rng.startswith("bytes=") or not os.path.isfile(caminho):
            self._faixa = None
            return super().send_head()
        try:
            ini, fim = rng[6:].split(",")[0].split("-")
            tam = os.path.getsize(caminho)
            if ini == "":
                ini, fim = max(tam - int(fim), 0), tam - 1
            else:
                ini, fim = int(ini), min(int(fim) if fim else tam - 1, tam - 1)
            if ini > fim or ini >= tam:
                raise ValueError
        except ValueError:
            self.send_error(416)
            return None
        f = open(caminho, "rb")
        f.seek(ini)
        self._faixa = fim - ini + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(caminho))
        self.send_header("Content-Range", "bytes %d-%d/%d" % (ini, fim, tam))
        self.send_header("Content-Length", str(self._faixa))
        self.end_headers()
        return f

    def copyfile(self, src, dst):
        try:
            if self._faixa is None:
                return super().copyfile(src, dst)
            resto = self._faixa
            while resto > 0:
                bloco = src.read(min(65536, resto))
                if not bloco:
                    break
                dst.write(bloco)
                resto -= len(bloco)
        except (BrokenPipeError, ConnectionResetError):
            pass


def vivo(porta):
    try:
        socket.create_connection(("127.0.0.1", porta), 0.5).close()
        return True
    except OSError:
        return False


def servir(pasta, porta):
    # sem chdir: a pasta do atlas é apagada e recriada quando ele é regerado, e o servidor precisa continuar valendo
    os.chdir(tempfile.gettempdir())
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", porta), functools.partial(H, directory=pasta))
    threading.Timer(HORAS * 3600, lambda: os._exit(0)).start()
    srv.serve_forever()


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--servidor":
        servir(sys.argv[2], int(sys.argv[3]))
        return
    pasta = str(Path(sys.argv[1]).resolve())
    reg = Path(tempfile.gettempdir()) / "atlas-servidor.json"
    try:
        r = json.loads(reg.read_text())
    except Exception:
        r = {}
    porta = r.get(pasta)
    if not (porta and vivo(porta)):
        porta = next(p for p in range(8765, 8865) if not vivo(p))
        kw = {"creationflags": 0x00000008 | 0x00000200} if os.name == "nt" else {"start_new_session": True}
        subprocess.Popen([sys.executable, __file__, "--servidor", pasta, str(porta)], stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL, **kw)
        for _ in range(40):
            if vivo(porta):
                break
            time.sleep(0.1)
        r[pasta] = porta
        reg.write_text(json.dumps(r))
    url = "http://localhost:%d/index.html" % porta
    if "--sem-abrir" not in sys.argv:
        webbrowser.open(url)
    print(url)


if __name__ == "__main__":
    main()
