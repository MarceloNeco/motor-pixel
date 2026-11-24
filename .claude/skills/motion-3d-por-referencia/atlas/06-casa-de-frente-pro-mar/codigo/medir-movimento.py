#!/usr/bin/env python3
"""Mede o movimento do vídeo (diferença média de luma entre quadros vizinhos, em 192x108, baldes de 0,5 s)
e compara com a medida da referência em pericia/movimento.json.
   python3 medir-movimento.py out/casa-de-praia.mp4
"""
import json, re, subprocess, sys, pathlib
video = sys.argv[1] if len(sys.argv) > 1 else 'out/casa-de-praia.mp4'
raiz = pathlib.Path(__file__).parent
txt = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf',
    'scale=192:108,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'],
    capture_output=True, text=True).stdout
# o valor pode vir em notação científica (quadro parado): o número inteiro precisa ser lido
pares = [(float(t), float(v)) for t, v in re.findall(r'pts_time:([\d.]+).*?YAVG=([\d.eE+-]+)', txt, re.S)]
baldes = {}
for t, v in pares: baldes.setdefault(int(t / 0.5) * 0.5, []).append(v)
perfil = {k: sum(v) / len(v) for k, v in sorted(baldes.items())}
vals = sorted(perfil.values()); med = vals[len(vals) // 2]; pico = max(vals)
picos = [k for k, v in perfil.items() if v > pico * 0.6]
vales = [k for k, v in perfil.items() if v < pico * 0.1]
maior = max(v for _, v in pares)
arq = raiz / 'movimento-referencia.json'
if not arq.exists(): arq = raiz / 'pericia' / 'movimento.json'
ref = json.loads(arq.read_text())
rp = {float(k): v for k, v in ref['perfil'].items()}
print(f'{"t":>6} {"nosso":>7}   {"referência":>10}')
for k, v in perfil.items():
    marca = ' pico' if k in picos else (' parada' if k in vales else '')
    r = rp.get(k)
    print(f'{k:6.1f} {v:7.2f}  {"#" * round(v / pico * 24):<24} {"" if r is None else f"{r:6.2f}"}{marca}')
print(f'\nmediana {med:.2f} | pico {pico:.2f} | amplitude {pico / med:.2f}x (ref. {ref["amplitude"]}x) | baldes de pico {len(picos)} | parada {len(vales) / len(perfil):.0%}')
print(f'maior salto entre dois quadros: {maior:.1f} (corte seco costuma passar de 35)')
fim = [v for t, v in pares if t >= max(t for t, _ in pares) - 0.8]
print(f'últimos 0,8 s: média {sum(fim) / len(fim):.3f}')
saida = {'arquivo': video, 'perfil': {f'{k:.1f}': round(v, 3) for k, v in perfil.items()}, 'mediana': round(med, 3), 'pico': round(pico, 3),
         'amplitude': round(pico / med, 2), 'picos': picos, 'vales': vales, 'maior_salto': round(maior, 2), 'final_08s': round(sum(fim) / len(fim), 4)}
(raiz / 'out').mkdir(exist_ok=True)
(raiz / 'out' / 'movimento-nosso.json').write_text(json.dumps(saida, indent=2, ensure_ascii=False))
