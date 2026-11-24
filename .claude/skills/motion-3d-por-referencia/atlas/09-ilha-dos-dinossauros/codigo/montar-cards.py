# Gera cards.html com as imagens embutidas, a partir de cards.modelo.html.
import base64, re, pathlib
raiz = pathlib.Path(__file__).parent
html = (raiz / "cards.modelo.html").read_text(encoding="utf-8")
def embutir(m):
    dados = base64.b64encode((raiz / m.group(1)).read_bytes()).decode()
    return f'src="data:image/jpeg;base64,{dados}"'
html, n = re.subn(r'src="(cards/[^"]+\.jpg)"', embutir, html)
(raiz / "cards.html").write_text(html, encoding="utf-8")
print(n, "imagens embutidas")
