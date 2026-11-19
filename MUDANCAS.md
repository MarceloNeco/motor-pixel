# Mudanças do Motor Pixel

## 1.0.0 — 19/11/2026

- Primeira versão publicada em `solverone.com.br/motor-pixel/1.0/`, a partir do pacote "Motor-Grafico" (pesquisa de 16/11/2026), com o nome novo **Motor Pixel**.
- Módulos: `nucleo`, `efeitos`, `offline`, `vetor`, `zoom`, `cena3d`, `personagens3d`, `camera3d`, `realce3d`, `holograma`.
- Three.js r187 copiado em `1.0/libs/` (minificado, com licença), com os addons usados (OrbitControls, GLTFLoader e o pós-processamento do brilho). Os módulos importam a biblioteca por caminho relativo: o app **não** precisa de importmap.
- **Gaveta compartilhada**: `offline.guardarNoAparelho()` guarda o motor uma vez só no aparelho (gaveta `motor-pixel-<versão>`), para todos os apps do mesmo endereço, e só marca um módulo como guardado quando todos os arquivos dele chegaram inteiros; `1.0/sw-motor.js` entrega esses arquivos no service worker de cada app, com ou sem internet.
- `personagens3d.criarPersonagem(null, url, cena)` já usa o leitor de .glb do motor; `lista()` mostra as animações e expressões do modelo.
- Exemplos novos em `/exemplos/`: cena 3D com personagem, partes 3D que acendem (realce3d) e holograma, com um boneco .glb livre (CC0) feito por `ferramentas/gerar-boneco.js`.
- Testes em `teste/` (`node --test teste/*.test.js`).
