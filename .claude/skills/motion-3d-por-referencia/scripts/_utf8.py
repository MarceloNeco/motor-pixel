"""No Windows, o Python lê e escreve arquivos e imprime no terminal numa codificação antiga (cp1252), que não tem
caracteres como → ou ≥ e quebra acentos em arquivos. Este módulo, importado no começo de cada ferramenta, reexecuta
o script em modo UTF-8 quando for preciso. Em Mac e Linux não faz nada."""
import os
import subprocess
import sys

if os.name == "nt" and not sys.flags.utf8_mode and os.environ.get("MOTION3D_UTF8") != "1":
    amb = dict(os.environ, MOTION3D_UTF8="1", PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    sys.exit(subprocess.run([sys.executable, "-X", "utf8"] + sys.argv, env=amb).returncode)
