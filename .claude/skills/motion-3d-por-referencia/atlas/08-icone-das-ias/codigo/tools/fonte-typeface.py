# Converte uma fonte TTF (variável ou não) no formato typeface.json do three.js (FontLoader),
# só com os glifos que o filme usa. Uso: python3 tools/fonte-typeface.py ENTRADA.ttf PESO SAIDA.json
import sys, json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen

src, peso, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
f = TTFont(src)
if 'fvar' in f:
    f = instantiateVariableFont(f, {'wght': peso, **({'opsz': 32} if any(a.axisTag == 'opsz' for a in f['fvar'].axes) else {})})
gs = f.getGlyphSet()
cmap = f.getBestCmap()
upm = f['head'].unitsPerEm
CHARS = sys.argv[4]

class Pen(BasePen):
    def __init__(self, gs):
        super().__init__(gs); self.o = []
    def _moveTo(self, p): self.o += ['m', p[0], p[1]]
    def _lineTo(self, p): self.o += ['l', p[0], p[1]]
    def _qCurveToOne(self, p1, p2): self.o += ['q', p2[0], p2[1], p1[0], p1[1]]
    def _curveToOne(self, p1, p2, p3): self.o += ['b', p3[0], p3[1], p1[0], p1[1], p2[0], p2[1]]
    def _closePath(self): pass

glyphs = {}
for ch in CHARS:
    cp = ord(ch)
    if cp not in cmap: continue
    name = cmap[cp]
    pen = Pen(gs); gs[name].draw(pen)
    o = ' '.join(str(round(v)) if not isinstance(v, str) else v for v in pen.o)
    glyphs[ch] = {'ha': gs[name].width, 'x_min': 0, 'x_max': gs[name].width, 'o': o}
hhea = f['hhea']
data = {'glyphs': glyphs, 'familyName': 'Inter', 'ascender': hhea.ascent, 'descender': hhea.descent,
        'underlinePosition': -100, 'underlineThickness': 50,
        'boundingBox': {'yMin': hhea.descent, 'xMin': 0, 'yMax': hhea.ascent, 'xMax': upm},
        'resolution': upm, 'original_font_information': {'format': 0, 'fontFamily': 'Inter', 'fontSubfamily': str(peso)}}
json.dump(data, open(out, 'w'))
print('glifos', len(glyphs), 'em', out)
