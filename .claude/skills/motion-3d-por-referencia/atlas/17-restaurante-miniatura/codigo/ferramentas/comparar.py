# Lado a lado e sobreposição (50%) do nosso quadro contra o da referência.
import sys
from PIL import Image
ours, ref, out = sys.argv[1], sys.argv[2], sys.argv[3]
a = Image.open(ours).convert('RGB').resize((1280, 720), Image.LANCZOS)
b = Image.open(ref).convert('RGB').resize((1280, 720), Image.LANCZOS)
blend = Image.blend(a, b, 0.5)
W = Image.new('RGB', (1280 * 2, 720 * 2))
W.paste(a, (0, 0)); W.paste(b, (1280, 0)); W.paste(blend, (0, 720))
W.save(out, quality=88)
