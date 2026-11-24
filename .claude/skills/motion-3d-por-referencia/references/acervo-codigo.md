# Acervo: onde está a melhor implementação de cada coisa

Mapa do código dos motions (levantado em novembro de 2026), com caminho e linha. Os caminhos usam o nome da pasta de
trabalho de cada projeto; a cópia aprovada de cada um vem dentro desta skill, em `atlas/NN-nome/codigo/` (o nome da
pasta de trabalho nem sempre é o do atlas: `rotina-casa` é o `01-rotina-na-casa`, `bitcoin-moedas` é o
`04-corrente-de-blocos`, e assim por diante; os números de linha podem variar um pouco). Use
para **ler a implementação que já funcionou** antes de escrever a sua: boneco articulado, IK, laço, reflexo planar,
profundidade de campo, pintura, lápis. O modelo da skill (`assets/template`) já traz a versão consolidada do básico
(tempo, câmera, formas, pipeline de subquadros, texto); o que está aqui é o que ficou de fora por ser específico.

Projetos que ainda não foram aprovados (`cidade-bicicleta`, `maquina-a-lapis`, `explicacao-2d-3d`) não estão no
atlas: para eles, vale só a descrição da técnica.

## Índice

- 4 · Helpers que se repetem (tempo, molas, sorteio, formas, texturas, personagem e poses, linha do tempo, câmeras)
- 5 · Renderer, luz e pós por projeto (tabela), acúmulo de subquadros, ordem dos passes, shaders reaproveitáveis
- 8 · Problemas de código encontrados (e já corrigidos no modelo da skill)

---

## 4 · Helpers que se repetem

Cada projeto redeclara os mesmos utilitários; só 7 têm módulo de utilitários separado (`cidade-bicicleta/src/base.js`, `relogio-mundos/src/util.js`, `casa-de-praia/src/util.js`, `restaurante-miniatura/src/util.js`, `ilha-dos-dinossauros/src/lib.js`, `kombi-na-praia/src/geo.js`, `mascote-aventura-3d/src/base.js`).

### 4.1 Matemática de tempo (clamp, lerp, remap, smooth, easing)
**Melhor base: `cidade-bicicleta/src/base.js:7-12`** (`lerp`, `clamp(x, a=0, b=1)`, `smooth(a, b, x)` com clamp, `io` = inOutCubic, `outCubic`, `outBack`) + o objeto `ease`/`seg` de `icone-das-ias/src/main.js:29-37`.
`seg(t, a, b, e = ease.lin) => e(clamp((t - a) / (b - a)))` (`icone-das-ias/src/main.js:37`) é o "trecho" mais útil: normaliza a janela e já aplica a curva.
**Variações perigosas** — `smooth` existe com 4 assinaturas diferentes: `smooth(x)` (bitcoin:19, ilha lib:11, labirinto:23, tenis:19, relogio util:11), `smooth(a, b, x)` (cidade base:9, casa util:7, duelo:15, kombi geo:9, poste:35), `smooth(x, a, b)` (planta:18), `smooth(t, a, b)` (mascote base:24); e `restaurante-miniatura/src/util.js:70` define `smooth = t => t*t*(3-2*t)` **sem clamp**. Nomes da janela 0..1 também variam: `seg` (adesivos:14, ilha lib:12, planta:15, rotina:595), `remap` (restaurante util:69), `span` (relogio util:10), `ramp` (mascote). `easeOut` cúbico em bitcoin/labirinto; com expoente em `relogio-mundos/src/util.js:12-13`.

### 4.2 Molas e quiques
- Mola amortecida fisicamente correta (frequência em Hz + razão de amortecimento): `icone-das-ias/src/main.js:39-44` (`spring(s, hz, damp)`), com `pop` e `quique` (`:45-46`) derivados. **Melhor.**
- Mola "de bolso": `restaurante-miniatura/src/util.js:78` (`springOut = 1 - e^{-dt}·cos(kt)`), `relogio-mundos/src/main.js:174`.
- Coice/catraca/decaimento por evento: `decay` (`adesivos-no-setup/src/main.js:19`), `kick` (`:183`), `ratchet` (`:185`), usados nos `SHOTS`.

### 4.3 RNG com semente (mulberry32)
Mesma função copiada em 16 lugares (`bitcoin:22`, `cidade base:13`, `duelo:18`, `ilha lib:14`, `labirinto:31`, `natureza:11`, `planta:20`, `poste:36`, `relogio util:15`, `tenis:20`, `rotina:18`, `adesivos adesivos.js:12`, `casa util:14`, `maquina/moto lapis.js:18` como `semente`, `mascote cena.js:19` como `rng`). **Melhor: `restaurante-miniatura/src/util.js:4-17`**, mesma matemática com açúcar:
```js
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + (hi - lo) * f(); f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f()); return f;
}
```
Mesmo arquivo traz `noise3` (simplex 3D, `:19-59`) e `fbm3` (`:60-64`). `halton(i, b)` (sequência de baixa discrepância para jitter/luz de área) está copiado em fone:145, icone:477, poste:759, relogio:267, restaurante main:117; `tenis-infinito/src/main.js:689` pré-calcula 64 pares.

### 4.4 Construtores de geometria (rb, cyl, sph, cap…)
**Melhor: `cidade-bicicleta/src/base.js:71-101`** — `sh` (liga sombra), `rb` (RoundedBox com raio limitado à menor meia-aresta, `:72-75`), `cyl`, `sph` (com `sy`), `cap`, `torus`, `aim(mesh, a, b)` (orienta peça de eixo Y entre dois pontos, `:82`), `tube(a, b, r)`, `arc`, `lathe` com UV pelo comprimento do perfil (`:90-95`), perfis `puck`/`ring` de borda arredondada (`:97-99`), `polar`.
```js
export function rb(w, h, d, mat, x = 0, y = 0, z = 0, r = 0.06) {
  const rr = Math.max(0.004, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
  const m = sh(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, rr), mat)); m.position.set(x, y, z); return m;
}
```
Variações: `rotina-casa/src/main.js:114-124` (a mesma família, com `bx(x0,x1,y0,y1,z0,z1)` por cantos), `relogio-mundos/src/util.js:23-47` (estilo "geometria pura": `rbox/sph/cyl/torus/capsule/lathe` devolvem `Geometry`, e `mesh(geo, mat, p, r, s)`/`group(children, p, r, s)` montam), `kombi-na-praia/src/kombi.js:15,49` (`std`, `rb` com pai), `ilha-dos-dinossauros/src/ilha.js:150` (`cyl/cone/ico` low-poly).
Materiais: `M(color, {r, m, cc, e, ei, op, ds})` **com cache por chave** em `cidade-bicicleta/src/base.js:52-61` (melhor); `std/metal/glow` em `relogio-mundos/src/util.js:18-20`.

### 4.5 Texturas em canvas
**Melhor: `relogio-mundos/src/util.js:79-88`** (opções `srgb`, `repeat`, `aniso`; `NoColorSpace` para mapas de dados).
Logo abaixo, `spaced()` (texto com espaçamento entre letras, `:90-96`). Variações em `cidade base:28-36` (sempre `RepeatWrapping`, aniso 8), `ilha lib:174`, `rotina:50`, `planta:71`, `duelo:186` (sem colorSpace), `poste:90` (`texOf(makeCanvas())`), `bitcoin:154`/`labirinto:202` (devolvem só o canvas). Exemplos de geradores: `cobble()` paralelepípedo (`cidade base:38-49`, gera `map` + `bump` cinza do mesmo desenho), `grain()` (`duelo:193`, `adesivos adesivos.js:30`), `noiseBump` (`adesivos objetos.js:168`), `bumpTex` de escamas (`ilha lib:187`).

### 4.6 Personagem articulado e sistema de poses
**Melhor: `rotina-casa/src/main.js`**:
- Boneco de grupos aninhados (`root → body → spine → head`, `shoulder → elbow → hand`, `hip → knee`), cada junta é um `THREE.Group` posicionado no pivô e as peças são `cap/sph/rb` filhas (`:380-412`).
- Pose = objeto plano de ângulos com defaults: `STAND` (`:414`) + `applyPose(p)` que só copia números para rotações (`:415-421`).
- Biblioteca de poses nomeadas `POSES` (`:603-616`) mescladas sobre `STAND`; `mixS(a, b, u)` interpola estado completo (posição, giro e cada ângulo, `:599-602`).
- Caminhada procedural: `walkPose(fase, amplitude, escada)` (`:623-631`), `makePath` (comprimento acumulado e fase por passada, `:632-640`), `walkState` (curva nas esquinas com `lerpA`, giro inicial/final, amplitude que entra e sai, `:641-654`).
- **Construtor de clipes encadeados** (`:655-708`): `hold(t1)`, `to(t1, estado, ease)`, `walk(t1, pontos, giroFinal)` — cada clipe começa onde o anterior terminou; `personAt(t)` (`:709`) e `findT(t0, t1, predicado)` (`:710`) para achar o instante de um evento (usado para cortar a câmera quando o boneco cruza o limite de um cômodo).
IK de dois ossos: `ilha-dos-dinossauros/src/lib.js:145-153` (`ik2(H, A, a, b, pole)`) e `cidade-bicicleta/src/ciclista.js:7-13` (`ik(A, B, l1, l2, bend, out)`, sem alocação — melhor para laço quente). Espinha por loft (anéis Catmull-Rom ao longo de pontos de controle) em `ilha lib:30-73` e `fkSpine` (`:128`). Figuras em lote (gente pequena) em `restaurante-miniatura/src/people.js:25` (`figure(r, {worker, seated, shirt, bag})`).

### 4.7 Linha do tempo em trechos
- Tabela de instantes nomeados + funções de estado por objeto: `restaurante-miniatura/src/timeline.js:9-26` (`TL = { h1In: 0.795, … }`, comentários com o quadro da referência) e `flagState(t)`, `handState(t)` (`:61`). É o formato que `ferramentas/audio.py` consegue ler por regex. **Melhor para sincronizar com áudio/fala.**
- `const T = { titulo: 0.25, abre: 1.5, … }` em `fone-explodido/src/main.js:16`, com cascata por índice (`abertura(k, t)`, `:24-28`).
- Laço que fecha sozinho: `LOOP`, `cyc(t, n)` e `env(t, a, b, up, down)` em `ilha-dos-dinossauros/src/lib.js:7,17-19` (n inteiro = emenda perfeita).
- Registro de atualizadores: `ctx.updaters` (`restaurante-miniatura/src/main.js:100`) e `setTime(t)` (`:114-116`) (cada módulo anima a si mesmo).
- Simulação física **pré-integrada** com passo fixo na abertura e lida por interpolação (determinística, roda também no Node): `kombi-na-praia/src/sim.js:1-4, 33-60`.

### 4.8 Câmeras, planos e cortes
- **Melhor (planos como funções)**: `adesivos-no-setup/src/main.js:244-360` — `SHOTS = [{ id, t0, t1, run(u, t) { … cam(fov, px, py, pz, lx, ly, lz); … } }]`, e `frame(t, tb)` (`:364-372`) escolhe o plano e chama `run(t - t0, t)`. O segundo tempo `tb` é o instante-base do quadro, para texto e carimbos entrarem secos enquanto o objeto recebe o tempo do subquadro.
- Planos de trilho declarativos: `mascote-aventura-3d/src/main.js:113-126` (`{ id, t0, t1, a:{p,l,fov}, b:{…}, e: curva, ap:[abertura0, abertura1], foc }` + `worldCam(t)` que interpola e calcula a distância de foco).
- Câmeras fixas + cortes secos derivados da ação: `rotina-casa/src/main.js:713-732` (`CAMS` + `SHOTS` com `t0: findT(...)`), `ilha-dos-dinossauros/src/main.js:93-112`.
- Câmera orbital por parâmetros (`az, pitch, dist, target, fov`) com override por URL `?cam=`: `restaurante-miniatura/src/main.js:35-36`; equivalente `CAM` em `maquina-a-lapis/src/main.js:88` (com `setViewOffset` para deslocar o enquadramento).
- Laço de câmera verificado numericamente (erro de emenda logado com `[cena]`): `tenis-infinito/src/main.js:752-757`.

---

## 5 · Renderer, luz e pós-processamento

### 5.1 `WebGLRenderer` por projeto
Comum a **todos**: `preserveDrawingBuffer: true` (necessário para `screenshot`/`toDataURL` depois do render), `setPixelRatio(1)` (ou `SS`), `setSize(W, H, false)`, `shadowMap.enabled = true` (menos mascote).

| projeto | AA | tamanho interno | saída / tom | sombra | luz principal | ambiente |
|---|---|---|---|---|---|---|
| rotina-casa | MSAA | 1920×1080 ×1 | sRGB · Neutral (expo animada `:490`) | PCFSoft 4096 | Dir sol + Hemi + 2 Point | RoomEnvironment PMREM |
| planta-casa | MSAA | ×1 | sRGB · Neutral | PCFSoft 4096 | 2 Dir + Hemi | RoomEnvironment |
| duelo-no-entardecer | MSAA | ×1 | sRGB · Neutral | PCFSoft 2048 | Dir + Hemi, **MeshToonMaterial** | céu em shader |
| bitcoin-moedas | não | ×1 | ACES | PCFSoft 4096 | Dir + Hemi + 2 Spot | PMREM de cena própria |
| natureza-retoma | MSAA + `alpha:true` | ×SS | ACES (expo por `?exp=`) | PCF 4096 | 2 Dir | PMREM de cena própria |
| moto / maquina-a-lapis | não | ×1 | NoToneMapping | **VSM** 2048 (radius 14, blurSamples 24) | Dir + Ambient + `MeshLambertMaterial` | — |
| cidade-bicicleta | MSAA | ×1 | sRGB · Neutral | PCFSoft 4096 | Dir + Hemi + 3 Point | RoomEnvironment |
| icone-das-ias | não (acumulação) | ×1 | Neutral (só no passe de saída) | PCFSoft 2048 + `shadow.focus` | Spot chave em disco (luz de área) + Hemi | PMREM de cena própria |
| ilha-dos-dinossauros | MSAA | ×1 | sRGB · Neutral | PCFSoft 4096, `blurSamples 16` | 2 Dir + 2 Hemi | RoomEnvironment |
| casa-de-praia | não | ×1 | NoToneMapping (o filtro de óleo revela) | PCFSoft 4096 | Dir + Hemi + Fog | — |
| relogio-mundos | não | ×1 | (padrão) — tom no `outMat` | PCF 2048/4096 | 3 Dir + 2 Hemi | PMREM de cena própria |
| adesivos-no-setup | MSAA | ×SS=2 (desenha em 4K) | Neutral | PCF 4096, radius 5 | 2 Dir | PMREM de cena própria |
| kombi-na-praia | não | ×1 | NoToneMapping (tom no `pos.js`) | PCFSoft `SH_MAP` | Dir + Hemi + Fog | PMREM (`fromScene(es, 0, 1, 1000)`) |
| poste-de-placas | não | ×1.25 (`IW×IH`) | NoToneMapping — "o tom e o sRGB são feitos no último passe" (`:64`) | PCF 2048 | Spot + 4 Point + Ambient | PMREM de painéis |
| tenis-infinito | não | ×1 | NoToneMapping (ACES no `outMat`) | PCF 4096 | Dir + Hemi, materiais em shader (feltro) | — |
| restaurante-miniatura | não | `w`×9/16 | **Linear** + NoToneMapping, tom/sRGB no `finalMat` | PCF 4096 | Dir + Hemi + 6 Point + 2 Spot + Fog | PMREM (descartado com `pm.dispose()`, `main.js:83`) |
| mascote-aventura-3d | não | 1600×SS | **Linear** e `ColorManagement.enabled = false` (`base.js:9,29`) | — | — (tudo em shader) | — |
| labirinto-do-robo | não | ×1 | ACES | PCFSoft 4096 | Dir + Hemi + 2 Point + Spot + Fog | PMREM de cena própria |
| fone-explodido | não (acumulação) | `w`×9/16 | (padrão) — tom próprio no `mFinal` | PCFSoft 4096, luz de área por subquadro | 3 Dir | RoomEnvironment, `environmentIntensity 0.95` |
| explicacao-2d-3d | MSAA | 1060×596 | sRGB · Neutral | PCFSoft 2048 | Spot + Hemi + Ambient | RoomEnvironment |

Padrão que funcionou para "miniatura/produto": **sem MSAA no canvas + acumulação de subquadros** (jitter Halton = antisserrilhado + desfoque de movimento + sombra macia de luz de área) + **render target HalfFloat/Float** + **tom e sRGB feitos à mão no último passe** (fone, restaurante, tenis, poste, icone, relogio).

### 5.2 Acumulação de subquadros (motion blur + AA + sombra de área)
Melhor implementação compacta: **`fone-explodido/src/main.js:111-145` e `:216-236`**.
```js
const rtCena = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtSoma = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false });
// mSoma: ShaderMaterial com blending Custom (One, One, Add): soma texture2D(tx).rgb * peso
function renderAt(t) {
  renderer.setRenderTarget(rtSoma); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let i = 0; i < SUB; i++) {
    const ts = t + ((i + 0.5) / SUB - 0.5) * OBTURADOR / FPS;   // obturador centrado no quadro
    estado(ts);
    camera.setViewOffset(W, H, halton(i + 1, 2) - 0.5, halton(i + 1, 3) - 0.5, W, H);   // jitter subpixel
    const ang = halton(i + 1, 5) * 6.2832, rr = Math.sqrt(halton(i + 1, 7)) * 1.9;        // luz de área em disco
    chave.position.set(LUZ.x + Math.cos(ang) * rr, LUZ.y, LUZ.z + Math.sin(ang) * rr);
    renderer.setRenderTarget(rtCena); renderer.clear(); renderer.render(scene, camera);
    quad.material = mSoma; mSoma.uniforms.peso.value = 1 / SUB;
    renderer.setRenderTarget(rtSoma); renderer.render(cenaQuad, camQuad);
  }
  camera.clearViewOffset(); /* passe final → canvas; depois texto 2D por cima */
}
```
Variações úteis:
- **Contagem adaptativa** pelo movimento projetado de âncoras (8 a 72 amostras): `poste-de-placas/src/main.js:752-776` (`samplesFor(t)`); por trecho rápido: `relogio-mundos/src/main.js:268-269` (`subFor`); por janelas `FAST`: `adesivos-no-setup/src/main.js:407-419`.
- Pós **dentro** do laço (DOF/bloom por subquadro antes de somar): `restaurante-miniatura/src/post.js:150-160` (`addSubframe`), `tenis-infinito/src/main.js:714-735`, `labirinto-do-robo/src/main.js:836-853` (o composer inteiro roda por subquadro).
- Dois tempos (subquadro × base): `icone-das-ias/src/main.js:430,485` (`frame(ts, t)` — a onda de cor usa o meio do quadro para a borda não borrar) e `adesivos-no-setup/src/main.js:364`.
- Proteção contra NaN/negativo antes de somar: `tenis-infinito/src/main.js:661-664`.
- Evitar: soma em **canvas 2D de 8 bits** com `globalAlpha = 1/(k+1)` (`adesivos-no-setup/src/main.js:408-419`) — média em sRGB e quantizada.

### 5.3 EffectComposer — ordem dos passes
- rotina-casa (`main.js:500-507`) e ilha (`main.js:58-66`): `RenderPass → GTAOPass → HorizontalTiltShift → VerticalTiltShift → OutputPass`; `setTilt(amount, r)` em `ilha-dos-dinossauros/src/main.js:66`.
- cidade-bicicleta (`main.js:96-133`): `RenderPass → GTAO → UnrealBloom → DOF H → DOF V (shader separável por profundidade, :107-126) → grade (véu + vinheta) → OutputPass`. Nota em `:127`: "o ShaderPass clona os uniforms; a textura de profundidade precisa ser a original".
- duelo (`main.js:759-820`): `RenderPass → UnrealBloom → finalPass próprio (vinheta violeta etc.) → OutputPass`.
- bitcoin (`main.js:103-139`): `RenderPass → BokehPass → OutputPass` + `Reflector` no chão (`:166`).
- labirinto (`main.js:111-185`): composer `RenderPass → BokehPass → UnrealBloom` (sem saída na tela, `renderToScreen = false`) → acumulador → `finalComposer`: `grade → OutputPass → grain`.
- poste (`main.js:712-749`): acumulador → `TexturePass → UnrealBloom → lens` (barril + aberração cromática + vinheta + Neutral + saturação + sRGB exato + grão).
- Sem composer, pipeline à mão com `FullScreenQuad`: fone, icone, tenis, relogio, restaurante (`post.js`), kombi (`pos.js`), casa-de-praia (`pintura.js`), maquina/moto (`lapis.js`), mascote.

### 5.4 Shaders próprios reaproveitáveis

| técnica | melhor arquivo | linhas | observação |
|---|---|---|---|
| Acumulação Float + jitter Halton + luz de área | fone-explodido/src/main.js | 111-145, 216-236 | o mais enxuto |
| Pipeline HDR completo como módulo (`createPost`: beginFrame / addSubframe / finish) | restaurante-miniatura/src/post.js | 7-180 | DOF + acumulação + bloom + revelação numa API de 3 chamadas |
| DOF "miniatura" em espiral áurea (Gustafsson), CoC por pixel | restaurante-miniatura/src/post.js | 28-58 | `nearBoost`, `rot` por subquadro |
| DOF em disco com CoC relativa ao foco (independe da escala) + anti-vazamento | tenis-infinito/src/main.js | 632-658 | 64 amostras, `uRot` |
| DOF separável H/V (barato) | cidade-bicicleta/src/main.js | 107-126 | |
| DOF disco + AO próprio + bloom + curva + vinheta + grão | kombi-na-praia/src/pos.js | 8-125 | AO em tela com ruído IGN (`:6-30`), DOF `:51-66` |
| Bloom em cadeia de mips (13 taps para baixo, tenda para cima, joelho suave) | restaurante-miniatura/src/post.js | 70-108 | substitui o `UnrealBloomPass` |
| Revelação: ACES fit + sRGB exato + saturação/contraste/lift/gain + grão por luminância | restaurante-miniatura/src/post.js | 110-147 | `seed` por quadro |
| Saída Neutral (Khronos PBR Neutral) + vinheta + grão | fone-explodido/src/main.js:122-143; poste-de-placas/src/main.js:724-749 | | fone usa `pow(1/2.2)`; poste usa a curva sRGB exata e tem barril + aberração |
| ACES + sRGB exato + grão | tenis-infinito/src/main.js | 666-686 | |
| Reflexo planar próprio (espelho com plano oblíquo + blur anisotrópico) + "piso molhado" via `onBeforeCompile` | restaurante-miniatura/src/post.js | 182-241, 245-272 | `makeWet` com Fresnel e máscara de poças; alternativa simples: `Reflector` (bitcoin:166, labirinto:228, poste:605) |
| Pintura a óleo: revelar → tensor de estrutura (Sobel) → borrar → **Kuwahara anisotrópico** (2 passadas) → tela (relevo, linho, borda) | casa-de-praia/src/pintura.js | 1-220 (Kuwahara `:59-108`) | depuração por etapa via `verEtapa` |
| Lápis/grafite: passada G (normal, profundidade, id) → contornos duplos → **hachura presa ao objeto** decidida pela luz → papel (dente, pautas, borracha) | maquina-a-lapis/src/lapis.js | 1-489 (folha de hachura `:43-72`, material `:73-150`, borda `:323`, papel `:375`) | idêntico a moto-a-lapis/src/lapis.js; inclui letra de arquiteto (`letras.js`) |
| Papel/ilustração 2D→3D com pré-distorção por profundidade | mascote-aventura-3d/src/base.js, papel.js | base.js:1-45 | caso especial |
| Camadas com desfoque por profundidade (fundo/frente/perto) + GTAO só na camada do meio | relogio-mundos/src/main.js | 37-84, 268-298 | |
| Tilt-shift (addons) | ilha-dos-dinossauros/src/main.js | 63-66 | |
| Grão por overlay DOM (`mix-blend-mode: overlay`) | natureza-retoma/src/index.html | 10-12 | barato, sem passe |
| Céu/mar em shader | duelo-no-entardecer/src/main.js | 113-140 | |

---

---

## 8 · Cheiros e problemas que a skill deve prevenir

1. **`PCFSoftShadowMap` não existe mais no three r187** — `node_modules/three/build/three.module.js:8944-8949` troca para `PCFShadowMap` e só avisa; `three.core.js:78` marca "deprecated since r186". Usado em 12 projetos: `bitcoin-moedas/src/main.js:65`, `casa-de-praia/src/main.js:48`, `cidade-bicicleta/src/main.js:21`, `duelo-no-entardecer/src/main.js:62`, `explicacao-2d-3d/src/main.js:93`, `fone-explodido/src/main.js:34`, `icone-das-ias/src/main.js:58`, `ilha-dos-dinossauros/src/main.js:21`, `kombi-na-praia/src/main.js:14`, `labirinto-do-robo/src/main.js:72`, `planta-casa/src/main.js:57`, `rotina-casa/src/main.js:37`. Regra: `PCFShadowMap` + `shadow.radius` (o PCF do r187 lê `shadowRadius`, `shadowmap_pars_fragment.glsl.js:174`) ou `VSMShadowMap`, ou sombra de área por acumulação.
2. **Avisos da página engolidos**: `m.type() === 'warning'` nunca casa no puppeteer-core 25 (o tipo é `'warn'`, `puppeteer-core/lib/puppeteer/cdp/utils.js:299-305`). Em 20 dos 21 `render.mjs` (ex.: `fone-explodido/render.mjs:44`); só `tenis-infinito/render.mjs` está certo. Por isso o item 1 passou despercebido.
3. **Determinismo entre execuções — `GTAOPass` sorteia ruído com `Math.random`** no construtor (`three/examples/jsm/postprocessing/GTAOPass.js:141,691-693` → `SimplexNoise(r = Math)`). `rotina-casa/src/main.js:501`, `ilha-dos-dinossauros/src/main.js:59`, `cidade-bicicleta/src/main.js:98` não semeiam: um `video resume`/`frames` em outra execução muda o padrão do denoise. Só `relogio-mundos/src/main.js:141-145` troca `Math.random` por `mulberry32(7)` durante a construção. O teste `igual` do cidade roda numa execução só e não pega isso. Fora isso, o código está limpo: nenhum `Date.now`, `performance.now`, `Clock`, `requestAnimationFrame` ou `Math.random` solto em `src/` (grep), e `MeshSurfaceSampler` recebe `setRandomGenerator(rng)` (`natureza-retoma/src/vegetacao.js:242`).
4. **Ruído GLSL com `sin()`** (ex.: `fone-explodido/src/main.js:132`, `maquina-a-lapis/src/lapis.js:21` `h1`) é estável na mesma GPU, mas não entre GPUs; preferir hash sem trigonometria (o `h12`/`h2` de `restaurante-miniatura/src/post.js:127` e o `h2` de `maquina-a-lapis/src/lapis.js:22`).
5. **Helpers divergentes com o mesmo nome**: `smooth` com 4 assinaturas e uma sem `clamp` (`restaurante-miniatura/src/util.js:70`) — ver 4.1; `mulberry32` copiado 16 vezes, `halton` 5, `canvasTex` 9 com opções diferentes (uma sem `colorSpace`, `duelo-no-entardecer/src/main.js:186`). A skill deve entregar **um** `util.js`.
6. **Acumulação em 8 bits** (canvas 2D com `globalAlpha`): `adesivos-no-setup/src/main.js:408-419`. Usar render target `FloatType`/`HalfFloatType` e soma aditiva.
7. **Cor do mp4**: 17 dos 21 codificam JPEG (faixa cheia, BT.601) para `yuv420p` sem etiqueta; só poste, tenis, adesivos (e labirinto, parcial) convertem e etiquetam BT.709.
8. **Perda dupla**: quadros em JPEG q96-97 e depois x264. Para máster, PNG (ou pipe `image2pipe`) e `-crf` baixo; JPEG só para cards/rascunho.
9. **Erros que não param o render**: só `ilha-dos-dinossauros/render.mjs:42-53,120` sai com código ≠ 0. Em `restaurante-miniatura/src/main.js:105-110` os módulos entram por `Promise.allSettled` e a página fica `ready` mesmo se um falhar (só loga `[cena] módulo falhou`). `execFileSync('ffmpeg')` sem tratamento.
10. **Sobras e cópias desalinhadas**: `explicacao-2d-3d/src/main.v1.js` (versão morta dentro de `src/`, também com `PCFSoftShadowMap`, `:64`); `fone-explodido/render.mjs:47` manda `&cam=` que o `fone-explodido/src/main.js` não lê, e a rota `/sysfonts/` (`:13-21`) não é usada no fone (herança do restaurante); `restaurante-miniatura/src/main.js:118,135` (`frameNo` nunca lido); `fone-explodido/ferramentas/audio.py:7` repete à mão os instantes de `main.js:16`.
11. **Fonte do sistema por nome** (`FONTE = '"Avenir Next", …'`, `fone-explodido/src/main.js:13`; `Arial Rounded Bold` via `/sysfonts/` em `restaurante-miniatura/src/restaurant.js:87`): só funciona no macOS; os 11 projetos com pasta `fontes/` carregam `.woff2/.ttf` locais e esperam a fonte antes do `ready` (o certo).
12. **Pipeline de cor misturado**: maioria em `SRGBColorSpace` + tone mapping do renderer; outros em `LinearSRGBColorSpace` com sRGB no shader (restaurante `main.js:19`, mascote `base.js:29` com `ColorManagement.enabled = false`); `fone-explodido/src/main.js:139` usa `pow(1/2.2)` em vez da curva sRGB exata (poste, tenis e restaurante usam a exata). Padronizar: render linear em HalfFloat → um passe final com tom + sRGB exato + grão.
13. **Custo por quadro**: `labirinto-do-robo/src/main.js:836-853` roda o `EffectComposer` inteiro (Bokeh + Bloom) a cada subquadro (8 por quadro); `tenis-infinito` faz DOF de 64 taps + bloom × 10 subquadros (`:714-735`); `adesivos` desenha em 4K com MSAA (`SS=2`, `antialias:true`, `:30-31`); GTAO em 4 projetos; sombra 4096 em 13. Mitigações já presentes: `QUALIDADE=rascunho`, `SUB=`, `LARGURA=`, contagem adaptativa (poste), `toDataURL` em vez de `screenshot` (restaurante). Nenhum projeto paraleliza (dá para abrir N páginas/processos por faixa de quadros, já que tudo é função de t).
14. **Vazamentos**: baixo risco porque a cena é montada uma vez e `renderAt` só muda transformações; `PMREMGenerator` não é descartado em 14 projetos (só `restaurante-miniatura/src/main.js:83` faz `pm.dispose()`) — custo único. Nos laços de render lidos (`renderAt`/`drawFrame` de fone, restaurante, icone, poste, labirinto, tenis, relogio, adesivos) não há criação de geometria, material ou textura; as funções `frame/estado` de cada cena não foram auditadas linha a linha.
15. **Servidor estático**: `file.startsWith(ROOT)` sem separador aceita pastas irmãs com o mesmo prefixo (ex.: `ROOT-velho/`); usar `path.relative` ou `ROOT + path.sep`. `poste-de-placas/render.mjs` faz `realpathSync` (segue symlink) depois da checagem.

---
