# O essencial

Uma página com o que mais evita retrabalho. É a única leitura obrigatória da skill; abra as outras referências só
quando travar num ponto específico.

## A ficha curta (`pericia/FICHA.md`, até 25 linhas)

Depois de rodar `pericia.py` e olhar a folha de 1 quadro por segundo e um ou dois quadros calmos em tamanho cheio:

```
Modo: fidelidade | estilo            Referência: <link ou arquivo>
Mecanismo: <uma frase que um espectador diria>
Momentos: <janela> <o que acontece> | <janela> <...>            (3 a 6)
Câmera: orto | perspectiva · lente longa/normal/grande-angular (≈ N°) · altura ≈ N° · parada | órbita | aproxima
Luz: vem das N horas · razão claro÷sombra no herói N:1 (sonda.py razao) · sombra dura | média | macia
Materiais: <herói: fosco/acetinado/brilhante/verniz/metal> · <apoio>
Herói: ocupa N% × N% do quadro, centro em (N%, N%)
Cor: fundo #… · herói #… · apoio #… · acento #… (só em <onde>) · p50 N · tom neutro | ACES
Lente: foco raso sim/não · desfoque de movimento sim/não · grão sim/não · vinheta sim/não
Ritmo: pausa e estalo | travelling · amplitude N× · quase-parada N% · N cortes
Nunca faz: <três coisas>
Troca: <o que é da referência e não entra> → <o nosso>
```

Só três medidas manuais valem sempre o tempo, porque o olho erra as três:

- a **razão de luz no herói** (`sonda.py QUADRO razao X,Y X,Y`): os dois pontos no MESMO material, um na face virada
  para a luz e outro na face oposta. Quando o nosso objeto tem outra forma, escolha os pontos equivalentes (face para
  a luz × face oposta), não a mesma posição na tela;
- **quanto do quadro o herói ocupa** (`sonda.py QUADRO area auto` num quadro sem texto; com título ou rótulos na tela,
  passe a caixa à mão, porque o texto entra na caixa automática);
- a **cor acesa de cada material** (`sonda.py QUADRO ponto X,Y` numa área iluminada, sem brilho): é ela que vira o
  token. Tirar a cor "no olho" dá um tom mais escuro e mais saturado que o real. Sem câmera resolvida por pontos (cena em que a composição não precisa bater ao pixel), estime a lente pela tabela: quase sem convergência =
17° a 26°; natural = 28° a 42°; linhas fugindo = 55° a 70°.

## O modelo em 30 linhas (não precisa ler as libs)

O projeto tem quatro lugares: `src/ds.js` (os números da ficha: cores, luz, imagem), `src/luz.js` (a luz do filme,
que a cena e o banco de peças usam), `src/pecas/NOME.js` (um objeto por arquivo) e `src/main.js`, em blocos nesta
ordem: formato → `T`, `PLANOS`, `KEYS` (tempo) → cena → `estado(t)` → `sobre(ctx, t)` (texto 2D) → pipeline e
contrato. Você não mexe no primeiro nem no último bloco.

```
tempo.js   cl(x) · mix(a,b,k) · seg(t, inicio, duracao) → 0..1 · ss(t, a, b) → 0..1 suave
           curvas (recebem 0..1): outCubic · inOut · outBack(k, excesso=1.7) · inBack · outExpo · quique
           mola(segundos, hz, amort) · baque(t, t0, amp, hz, amort) → tremor que morre (some à escala/posição)
           escalonar(t, t0, i, passo, duracao, curva) · degrau(t, porSegundo) · fase(t, dur) · mulberry32(semente)
           planoEm(PLANOS, t) · mapaDeTempo([[tNovo, tOriginal], ...])
camera.js  aplicarCamera(camera, W, H, { az, el, dist, alvo:[x,y,z], fov })      (orto: alt no lugar de fov)
           entreCameras(a, b, k) · cameraPorChaves([{ t, cam }], t) · enquadrar(camera, W, H, cam, Box3, margem)
           naTela(camera, W, H, [x,y,z], objeto?) → { x, y } em px (para rótulos presos à cena)
formas.js  caixaMacia(larg, alt, prof, mat, { expoente: 4 }) → bloco macio de brinquedo (2,5 ovo · 8 caixa)
           rb(larg, alt, prof, mat, x, y, z, raio) · bx(x0,x1, y0,y1, z0,z1, mat) · cyl(rTopo, rBase, alt, mat, x,y,z)
           sph(r, mat, x,y,z) · cap(r, comp, mat) · torno([[raio, altura], ...] de baixo para cima, mat)
           extrusao([[x,y], ...], prof, mat, chanfro) · tubo([[x,y,z], ...], raio, mat) · comPivo(obj, [x,y,z])
           M(cor, { r: rugosidade, m: metal, verniz, bump, rep, e: emissivo, transp }) · canvasTex(w, h, (ctx,w,h)=>{})
           granulado() → relevo para bump · muitos(geo, mat, [{ p, r, s, cor }]) → InstancedMesh
pos.js     criarPipeline(renderer, W, H, { sub, obturador, tom:'neutro'|'aces', exposicao, contraste, saturacao,
             vinheta, grao, foco:{ alvo, abertura } }) → pipe.render(t, { estado, scene, camera, porSubquadro, sobre })
           sol(cor, força, [x,y,z], { meia }) → luz com sombra · luzDeArea(luz, [x,y,z], raio, alvo) → porSubquadro
pecas.js   await carregarPeca('nome', [larg, alt, prof], opcoes) → { grupo, pose(estado), pronta }
           (se src/pecas/nome.js ainda não existe, entra um substituto desse tamanho, com uma seta na frente)
texto.js   const texto = criarTexto('Inter', S, cor) → texto(ctx, 'STR', x, y, { peso, tam, esp, cor, alinha, alfa, max })
           carregarFontes([{ familia, peso, url }]) · zonaSegura(W, H) → { x0, x1, y0, y1, largura, altura }
```

Peça isolada em quatro vistas (todo objeto que precisa ficar bom): `src/pecas/NOME.js` exportando
`default function criar()` → um grupo ou `{ grupo, pose(estado) }` (base em y = 0, frente para +z, escala do filme), e
`node render.mjs peca NOME --luz=filme [--ref=pericia/recortes/NOME.jpg] [--t=0.5] [--q=rascunho]` →
`out/pecas/NOME.jpg`. Até cinco rodadas por peça.

Render: `node render.mjs at 1.2 3.4 --q=rascunho --w=960` (quadros em `out/teste/`, que é limpa a cada chamada) ·
`cards` · `folha` · `video [--q=rascunho --w=960] [--de=3 --ate=5]` · `determinismo`. O rascunho sai em
`out/NOME-rascunho.mp4` e o final em `out/NOME.mp4`: um nunca apaga o outro.

## As dez regras de three.js

1. **`renderAt(t)` é função pura do tempo.** Sem relógio, sem `+=` entre quadros, sem `Math.random` (use
   `mulberry32`). Todos os instantes na tabela `T`. Troca de estado de um objeto (solto → preso) é sempre uma
   mistura de 0,2 a 0,4 s, nunca um `if` seco: seco vira salto e cópias em fila.
2. **Não troque o pipeline do modelo.** Ele já faz desfoque de movimento, antisserrilhado, sombra macia (luz de
   área), tom, cor do arquivo e alfa. `renderer.toneMapping` fica desligado: o tom é dele.
3. **Tom `neutro`** para cor de marca, produto e pastel; **`aces`** para noite, neon e fotorreal.
4. **Luz de lado, pouco ambiente.** Chave a 50° ou 60° da câmera, contraluz por trás. Quem decide o contraste é o
   ambiente: `environmentIntensity` 0,95 dá quase 1:1 (chapado); 0,5 a 0,6 dá 2:1 a 2,5:1. Baixou o ambiente,
   suba a exposição até o p50 voltar.
5. **Sombra:** `PCFShadowMap` (o `PCFSoftShadowMap` foi removido no r187). Câmera de sombra justa em volta da cena.
6. **Material de produto, não de massinha:** verniz (`clearcoat`), duas cores, microrrelevo em superfície grande.
   Metal precisa de algo claro para refletir.
7. **Texto em 2D por cima** (`sobre(ctx, t)`), com fonte de arquivo carregada antes do primeiro quadro e `max` para
   nunca sair do quadro. Português conferido no quadro.
8. **Câmera:** parada dentro do plano e corte seco entre planos (filme de pausa e estalo), ou
   `cameraPorChaves` (plano único). Nada alto entre a câmera e o herói; o lado de perto cresce com a perspectiva.
9. **Torno (`LatheGeometry`) de baixo para cima;** todo `pow()` de shader com `max(x, 0.0)`; bloom com limiar acima
   de 1,0; `ShaderPass` perde a textura do construtor (reatribua).
10. **Leia os avisos `[página]`** no terminal e rode `node render.mjs determinismo` uma vez antes do render final.

## A revisão de um minuto (antes de animar e antes de entregar)

Abra dois ou três quadros em tamanho cheio e responda:

- Tudo cabe no quadro? Algo tapa o herói? O herói está de frente ou três quartos?
- O herói tem lado claro e lado escuro? (se parecer duvidoso, `sonda.py razao`)
- A sombra encosta no objeto? Algum branco estourado ou preto afundado?
- Cada peça lê como o que é, olhando o quadro pequeno? Alguma peça atravessa outra?
- O texto está inteiro, legível, com acento certo?
- Algum objeto some por ter a cor do fundo? O acento aparece num lugar só?

## Os números servem ao olho, não o contrário

O teste de aceite existe para apontar onde olhar. **Nunca mude um token do sistema de design só para um portão
passar.** Caso real: o herói novo era quase todo de uma cor escura, a luminância dos escuros reprovou, e clarear a cor
base fez o portão passar e o filme piorar. Os percentis de luminância dependem de quanta área cada cor ocupa: quando o
objeto é outro, eles mudam mesmo com cor e luz idênticas. Se reprovar em luminância ou saturação, confira nesta ordem:
(1) a cor acesa de cada material bate com a medida na referência? (2) a razão de luz no herói bate? Se as duas batem, a
diferença é de área, não é defeito: registre e siga. Só então mexa em exposição e gradação.

## O conserto de ritmo, em uma linha

Se o `comparar.py` reprovar amplitude, quase-parada ou picos: **eleja um soco e acalme o resto** (mais área do quadro
mudando em menos quadros, pausa antes e depois, câmera parada durante a ação). Nunca "acelerar tudo".

## Peça que vem do banco para a cena

Uma peça boa no banco pode chegar opaca ou lavada na cena. Confira três coisas na integração: ela recebe o mesmo
ambiente e a mesma força de reflexo das vizinhas (com `--luz=filme` no banco isso já vem certo); metal escovado e
lente de olho pedem menos reflexo que o resto; nada dela atravessa nem tapa o herói no quadro principal.
