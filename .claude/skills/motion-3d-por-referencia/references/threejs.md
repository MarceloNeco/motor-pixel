# three.js para filme: as regras de engenharia

Vale para three r187 (a versão fixada no modelo) renderizado quadro a quadro no Chrome sem janela. Cada regra aqui
nasceu de um defeito real em um dos 18 motions do acervo; o motivo vem junto para você saber quando ela não se aplica.
Quando a tarefa tocar numa parte do three.js que você não usou recentemente (um passe dos addons, um material físico,
WebGPU/TSL), confira o código em `node_modules/three/examples/jsm/` antes de escrever de memória: a API muda entre
versões e os avisos de coisa removida são fáceis de perder.

## Índice

1. A cena é uma função do tempo
2. O pipeline de imagem do modelo
3. Cor: linear até o fim, tom uma vez, gradação em exibição
4. Luz e ambiente por tipo de mundo
5. Sombra
6. Câmera
7. Geometria, materiais e texturas
8. Texto
9. Pós-processamento além do modelo
10. Linha do tempo e animação
11. Render, desempenho e arquivo final
12. Alfa, vertical e áudio
13. Os erros que não avisam

---

## 1. A cena é uma função do tempo

`renderAt(t)` recalcula a cena inteira para o instante `t`. Nada de relógio (`Clock`, `Date.now`,
`performance.now`), nada de `+=` entre quadros, nada de `Math.random` sem semente, nada de `requestAnimationFrame`
no caminho do render. Motivo: o filme é fotografado quadro a quadro, fora de ordem quando você confere um card ou
refaz um trecho, e cada quadro é a soma de vários subquadros em instantes vizinhos. Com estado acumulado, o card não
bate com o vídeo e um render retomado não emenda.

- Sorteio: `mulberry32(semente)` de `lib/tempo.js`. Ruído que varia por quadro (grão, poeira) usa o **número do
  quadro** como semente.
- O que é simulação de verdade (física de molas, trajeto integrado, quem comeu o quê) roda **uma vez na abertura**,
  em passo fixo, e é guardado numa tabela; `estado(t)` só lê a tabela por interpolação.
- Código de terceiros que sorteia: `GTAOPass` e outros passes chamam `Math.random` ao serem criados. Crie-os dentro
  de `comSemente(7, () => new GTAOPass(...))`, senão o padrão do ruído muda a cada execução.
- Ruído em GLSL: use hash sem seno (o `h()` de `lib/pos.js`). `fract(sin(...))` é estável numa placa e muda em outra.
- Prova: `node render.mjs determinismo` renderiza os mesmos instantes em ordens diferentes e compara byte a byte.
  Rode depois de montar a animação e de novo antes do render final.

## 2. O pipeline de imagem do modelo

`criarPipeline()` em `src/lib/pos.js`. Cada quadro do filme é a média de N renders (subquadros) feitos em instantes
vizinhos, num alvo de ponto flutuante, com a câmera deslocada menos de um pixel a cada um. De uma vez isso entrega:

| Efeito | De onde vem | Controle |
|---|---|---|
| Desfoque de movimento real | os subquadros cobrem o tempo do obturador | `obturador`: 0,5 = 180° (cinema) · 1 = 360° (time-lapse) · 0 = nenhum |
| Antisserrilhado | deslocamento subpixel (Halton) | `sub` |
| Sombra de borda macia | a luz muda de lugar num disco a cada subquadro | `luzDeArea(luz, centro, raio)` |
| Profundidade de campo | a lente muda de lugar e o plano de foco fica parado | `foco: { alvo: [x,y,z], abertura }` (só perspectiva; `abertura` em unidades do mundo; com menos de 32 subquadros o desfoque mostra cópias) |

Quantos subquadros: 4 a 6 em rascunho; 16 no normal; 24 com luz de área larga; 48 quando a sombra macia mostra
degraus; até 96 enquanto uma peça voa perto da lente. Poucos subquadros com movimento rápido não ficam "meio
borrados": viram cópias em fila (o defeito lê como hachura). Se só um trecho é rápido, suba `sub` só nele (`sub` aceita uma função: `sub: t => (t > 2 && t < 2.5 ? 96 : 24)`; uma
função de `t`), para não pagar o filme inteiro.

**O que tem de ficar nítido sai do acúmulo.** Texto, rótulos, adesivos e qualquer borda gráfica que anda rápido
(uma onda de cor atravessando o quadro virou um clarão de 108 px dentro do desfoque) são desenhados no instante
central do quadro: em 2D por cima (`sobre(ctx, t)`), ou com um segundo tempo passado à cena (o tempo do subquadro
para os objetos, o tempo do quadro para o grafismo). Saltos de time-lapse (gente que pula de lugar) são alinhados à
troca de quadro com `degrau()`, senão viram fantasmas.

No laço, o desfoque do primeiro quadro precisa enxergar o fim do filme: `estado` recebe o tempo módulo a duração.

## 3. Cor

1. A cena é desenhada em **luz linear**, em `HalfFloat`. Cores de material entram em sRGB e o three converte
   (`ColorManagement` ligado, o padrão). Textura de cor: `colorSpace = SRGBColorSpace`. Textura de dado (relevo,
   rugosidade, máscara): sem `colorSpace`.
2. O **tom** (tone mapping) acontece uma vez, no último passe, junto com a conversão para sRGB pela curva exata.
   Por isso `renderer.toneMapping = NoToneMapping`: renderizando para um alvo, o three não aplica tom nem sRGB, e
   aplicar duas vezes lava a imagem.
   - `neutro` (Khronos PBR Neutral): mantém matiz e saturação. Padrão para marca, produto, fundo pastel. Os filmes
     que trocaram ACES por ele foram os de laranja, pêssego e petróleo, que o ACES puxava para amarelo ou lavava.
   - `aces`: ombro de cinema, dessatura os claros. Noite, neon, fotorreal.
3. A **gradação** vem depois do sRGB, em espaço de exibição: `exposicao` (antes do tom), `contraste` em torno de
   `pivo`, `saturacao`, `piso`, `teto`, `tinta`. Contraste aplicado em linear primeiro esmagou os pretos e depois
   lavou a imagem. Em modo fidelidade, case por percentis: exposição até o p50 bater, contraste até p5 e p95
   baterem, piso e teto para as pontas. O `comparar.py` dá os números dos dois lados.
   A **vinheta** do pipeline é a fração que o canto extremo escurece (0,10 = 10%), igual em qualquer formato. Em
   fidelidade, a meta é 1 − (cantos ÷ centro) do `MEDIDO.md` quando o fundo é liso; se o fundo já é um degradê, a
   vinheta é do fundo e a do pipeline fica em zero. Os valores de vinheta dos projetos antigos do acervo usam outra
   fórmula e não se traduzem direto.
4. **Faixas no fundo** (banding): fundo escuro ou degradê pastel vira faixas depois da compressão. Grão fino (`grao`
   0,008 a 0,018) resolve. Com alfa, o grão vai só no fundo, nunca por cima do objeto.
5. O **MP4** sai em BT.709 faixa de vídeo, marcado (o `render.mjs` já faz). Sem isso o arquivo fica BT.601 faixa
   cheia e editores e players de HD mostram outra cor.

## 4. Luz e ambiente por tipo de mundo

A regra que mais se repetiu: **luz principal de lado (50° a 60° da direção da câmera), pouco preenchimento, um
recorte por trás, e algum escurecimento nos encontros.** Com a luz atrás da câmera as sombras se escondem atrás dos
objetos e a imagem fica chapada. "Muito preenchimento e nenhuma oclusão" lê como pacote de ícones 3D.

| Mundo | Receita |
|---|---|
| Estúdio claro, fundo infinito (produto, ícone, vista explodida) | Fundo = degradê em espaço de tela (textura de fundo ou CSS), não parede 3D. Chão = `ShadowMaterial`. Chave quente forte (intensidade 2,5 a 4) de cima e de lado, como luz de área; contraluz fria 1 a 1,6; `RoomEnvironment` com `environmentIntensity` 0,8 a 1. Ambiente sempre **neutro**: ambiente da cor do fundo deixa a sombra cinza e o branco tingido. |
| Estúdio escuro (joia, metal, gráfico como objeto) | O metal mostra o que reflete: ambiente próprio (`PMREMGenerator.fromScene` de uma cena com painéis claros) com um painel grande do lado da chave e uma faixa fina atrás do lado oposto. Ambiente uniforme = metal chapado; ambiente claro = aço com cara de plástico cinza. Uma luz fraca lavando o fundo para a imagem existir em tela de celular. |
| Maquete de dia (casa em corte, ilha, cidade) | Câmera ortográfica; sol direcional quente; hemisférica fraca; oclusão nos encontros (`GTAOPass`) e tilt-shift. Texturas grandes. |
| Noite com luzes locais | Um foco forte de borda macia sobre o herói e o resto no escuro; luzes locais fortes (postes, vitrines, faróis); névoa escura que apaga o fundo; lâmpadas distantes com `fog: false` para virarem bokeh. Luz geral fraca com foco fraco só deixa tudo escuro. Comece com as luzes fracas e suba: pontos a centímetros de uma superfície estouram. |
| Luz de flash | Luz presa à câmera com força corrigida pela distância ao herói: o que está perto estoura, o longe cai no preto. |
| Desenho e pintura (lápis, toon, óleo) | Luz simples e legível, do lado da câmera e alta; só massas grandes projetam sombra; sem grão de filme, brilho ou desfoque. |

**Como chegar na razão de luz medida** (o que mais custou no teste da skill: oito renders até acertar). A receita
de estúdio claro, sozinha, dá perto de 1,0:1 num corpo cilíndrico de pé, que é o pior caso: a luz do alto e o ambiente
forte iluminam a volta inteira. Faça nesta ordem, medindo com `sonda.py razao` no nosso card a cada passo:

1. Ponha a luz principal na direção que a sombra da referência indica (o lado, não necessariamente a altura).
2. **Baixe o ambiente** (`environmentIntensity`) até a razão claro ÷ sombra do herói chegar perto da medida. É o
   ambiente, não a luz principal, que decide o contraste: 0,95 dá quase 1:1; 0,5 a 0,6 dá perto de 2:1 a 2,5:1.
3. A imagem escureceu: **suba a exposição** (ou a força da luz principal) até o p50 voltar à medida.
4. Ajuste a contraluz para o fio de recorte, e a posição do chão ou a altura da luz se a sombra saiu do quadro.
5. Só então mexa em cor de luz e gradação.

Se a frente do herói ficou sem luz ao pôr a chave de lado, a chave está de lado demais para aquela forma: volte uns
15° para a câmera e compense no ambiente.

Detalhes que custaram rodada: luz por trás num chão polido volta para a câmera e clareia tudo; chão molhado não pode
refletir o céu falso do ambiente (zere o reflexo de ambiente no material do chão e deixe só o espelho da cena); uma
"bandeira preta" atrás da câmera no ambiente impede o verniz de lavar a face do herói; quando a câmera dá a volta, a
luz principal acompanha o lado da câmera, senão o rosto do herói fica preto na metade do filme.

## 5. Sombra

- `PCFSoftShadowMap` **foi removido no r187** (o three troca por `PCFShadowMap` e só avisa). Use `PCFShadowMap` com
  `shadow.radius`, `VSMShadowMap` quando a sombra dura de peças finas virar recortes quadrados, ou, melhor, a luz de
  área por subquadros.
- Luz de área: 16 e 32 subquadros mostram degraus na borda quando a luz é larga; 48 fica liso.
- Câmera de sombra justa em volta da cena (`meia`, `perto`, `longe` em `sol()`). Mapa de 4096. Se a câmera fecha num
  detalhe, reajuste a área da sombra para aquele plano.
- **Viés:** o `bias` é uma fração da faixa perto..longe. Um valor "padrão" de −0,0004 numa faixa de 60 unidades
  descola a sombra 0,024 unidade do pé do objeto: uma fresta de luz no contato, visível em plano fechado. O modelo usa
  −0,00003 com `normalBias` 0,002; se aparecer ruído listrado nas superfícies, suba o `normalBias` aos poucos.
- Sombra que segue um objeto em movimento: mova o mapa em passos de um texel, senão as bordas fervem.
- Tudo o que muda a forma no shader (crescimento, recorte com `discard`, revelação por varredura) precisa estar
  também no material de profundidade (`customDepthMaterial`), senão a sombra aparece antes da flor ou a janela não
  deixa a luz entrar.
- Peça muito rente a uma superfície não projeta sombra visível: desenhe a sombra na textura.

## 6. Câmera

- Use `aplicarCamera(camera, W, H, { az, el, dist, alvo, fov })` (`lib/camera.js`): é a mesma convenção que o
  `camera.py` devolve ao resolver a câmera da referência, e dá para interpolar.
- Filme com cortes: `PLANOS` + `planoEm()`. Filme de plano único (órbita, aproximação, travelling):
  `cameraPorChaves(CHAVES, t)`, sem o `enquadrar()` automático do modelo.
- **Parada dentro do plano, corte seco entre planos** é o padrão dos filmes de pausa e estalo. Movimento de câmera
  mexe todos os pixels e apaga a diferença entre pausa e soco. Nunca crossfade onde a referência corta.
- Cortes derivados da ação ("corta quando o personagem cruza a divisória") continuam certos se o trajeto mudar: calcule
  o instante em vez de digitá-lo.
- Movimento com chaves: curva cúbica monotônica (não passa do alvo entre chaves); velocidade zero nas chaves em que a
  câmera para de verdade; uma chave antes do começo se o primeiro quadro já deve estar em movimento.
- Câmera que acompanha um herói: siga uma versão **suavizada** da posição dele (ela não repete cada tranco), e
  reenquadre o herói num ponto fixo da tela numa segunda passada.
- **Antes de aprovar um caminho de câmera, amostre-o** (a cada 0,05 s) contra tudo o que é alto: distância mínima da
  lente, nada entre a câmera e o herói. Objeto colado na lente foi o defeito de composição mais repetido.
- Perspectiva faz o lado de perto crescer: numa cena que se abre, desloque o alvo para o lado de perto e comece o recuo
  **antes** da abertura, senão as peças saem do quadro por meio segundo. `enquadrar()` calcula a distância para uma
  caixa caber no formato.
- Planos de corte proporcionais à distância quando a escala muda muito (`near` = 1% da distância ao alvo).
- Câmera de inspeção: `--cam=az,el,dist,x,y,z,fov` no render (ou `?cam=` na página) para olhar a cena de outro
  lugar sem mexer no filme. Uma vista de cima sem pós confere coreografia.

## 7. Geometria, materiais e texturas

Tudo em código: primitivas, tornos, extrusões, tubos, SDF. Os helpers estão em `lib/formas.js`.

- `LatheGeometry`: o perfil vai **de baixo para cima**. Ao contrário, a peça fica do avesso e lê como buraco claro.
- Ovalização na geometria (`geometry.scale`), não no grupo: rotação dentro de escala não uniforme deforma.
- **Peça feita no banco entra na cena com o ambiente da cena.** No banco o ambiente é de estúdio e forte; se a cena
  tem ambiente fraco ou materiais com `envMap` próprio, a peça nova sai opaca ao lado das vizinhas. Na integração,
  percorra os materiais da peça e dê a eles o mesmo ambiente e a mesma força dos vizinhos (marcando os já tratados:
  `M()` reaproveita o mesmo material entre peças, e aplicar duas vezes dobra o efeito). Metal escovado e lente de olho
  costumam precisar de MENOS reflexo que o resto.
- Corpo macio de brinquedo (vinil, almofada): `caixaMacia()` em vez de `rb()`. A caixa arredondada do three tem a
  face plana num quadrado só: não estufa, e com raio grande enterra o que está pousado na face (olhos, botões).
- Peça oca que vai ser vista por dentro precisa de parede dupla. Pontas de formas lofteadas fecham num ponto (raio
  pequeno no último anel deixa um furinho).
- SVG → `SVGLoader` → `ExtrudeGeometry` com o chanfro **para dentro** (o contorno fica no tamanho exato do desenho);
  confira a silhueta contra o SVG original. "Engrosse a altura da peça, nunca o contorno."
- Milhares de iguais: `InstancedMesh` (`muitos()`), com o instante de nascer num atributo e a animação no vertex
  shader. Nenhuma matriz recalculada por quadro.
- **Material de produto, não de massinha:** verniz (`clearcoat`), duas cores no corpo, linha de junção, comandos em
  outro material. Tudo fosco e de uma cor lê como argila, e isso já foi reprovado.
- Superfície grande e lisa precisa de microrrelevo (`bumpMap` granulado) para pegar luz como objeto.
- Miniatura: **texturas grandes** (tábua larga, trama grossa) e gente grande em relação à arquitetura.
- `AdditiveBlending` soma o alfa também: num vidro composto em camadas com alfa, vira disco preto. Use mistura
  personalizada que some só a cor.
- `Reflector` clona a câmera principal com as layers: ponha o texto numa layer que a câmera vê e o espelho não.
- Transparência e ordem: quem tem de aparecer por cima vai na fila dos transparentes com `renderOrder` maior;
  decalques e adesivos usam `polygonOffset`.
- Texto em anel ou textura que dá a volta: a emenda corta o que estiver nela. Desenhe o conteúdo nas duas pontas e
  confira num quadro ampliado.

## 8. Texto

- **Fonte de arquivo, carregada antes do primeiro quadro** (`carregarFontes` em `lib/texto.js`; pacotes
  `@fontsource/...` do npm ou a pasta `fontes/`; o comentário no topo de `texto.js` diz como trazer outra família).
  A fonte é parte do sistema de design: em fidelidade, escolha a família livre mais próxima da medida e registre a
  troca. Fonte chamada pelo nome do sistema funciona numa máquina e cai na
  reserva em outra, e sem esperar o carregamento o primeiro card sai com a fonte errada.
- Texto 2D por cima do quadro pronto (`sobre(ctx, t)`): nítido, com acentos certos, fora do desfoque e do grão. O
  `max` de `texto()` encolhe o corpo para caber: palavra nunca sai do quadro, nunca é cortada nem encoberta, mesmo que
  a referência faça. Texto preso a um ponto da cena: `naTela()` projeta o ponto.
- Texto que mora no mundo (letreiro, número extrudado): `TextGeometry` com a fonte convertida por
  `scripts/fonte-typeface.py` (só os glifos usados), ou `CanvasTexture` num plano.
- Português: acentos e cedilha conferidos no quadro, vírgula decimal, dia da semana conferido no calendário,
  abreviação que não lê como inglês. Espaçamento muito negativo embola pares como "ui".
- Em vertical, use `zonaSegura()`: 12% do topo e 15% da base ficam livres de texto.

## 9. Pós-processamento além do modelo

O pipeline do modelo cobre desfoque de movimento, antisserrilhado, sombra macia, foco, tom, gradação, vinheta e grão.
O resto entra quando a perícia pede, e cada um tem uma armadilha conhecida:

| Efeito | Como | Cuidado |
|---|---|---|
| Oclusão nos encontros | `GTAOPass` num `EffectComposer` | criar com `comSemente`; custa caro por subquadro: rode em meia resolução ou só numa camada |
| Tilt-shift (ortográfica) | `HorizontalTiltShiftShader` + `VerticalTiltShiftShader` | para perspectiva, prefira `foco` |
| Bloom | `UnrealBloomPass` ou cadeia de mips própria | limiar **acima de 1,0** e força baixa (0,2 a 0,4); bloom espalha qualquer NaN pela tela inteira |
| Profundidade de campo em tela | shader próprio por profundidade | o `BokehPass` pronto deixa o nítido da frente vazar sobre o fundo (halo); uma amostra mais próxima só entra se o desfoque dela alcança o pixel. Alternativa robusta: camadas renderizadas e desfocadas em separado |
| Reflexo no chão | `Reflector`, ou espelho próprio com borrão | texto fora da layer do espelho; chão sem reflexo do ambiente falso |
| Contorno, lápis, pintura | passada auxiliar com normal, profundidade e id; filtros em tela | o look nasce no material tanto quanto no filtro: filtro sozinho sobre cor lisa devolve "render com filtro" |

Três recursos que o pipeline não traz e que já resolveram cenas difíceis:

- **Desfoque por camada.** A lente fina (`foco`) dá o desfoque fisicamente certo, mas às vezes a referência tem o
  fundo muito mais mole do que a distância justifica (pelúcias atrás de um herói nítido, a poucos palmos). Mova a
  camada do fundo num pequeno disco a cada subquadro (com `r2`): ela borra sozinha no acúmulo, sem passe de pós, e o
  resto fica nítido.
- **Luz que acompanha o herói.** Quando o contraste medido no herói não sai com as luzes da cena (várias fontes
  preenchendo de todos os lados), um foco estreito preso à posição do herói entrega a razão medida sem mexer no resto.
- **Ambiente por material.** Superfícies planas viradas para a câmera refletem a caixa de luz da frente e estouram;
  dê a elas (`envMap` no material) um ambiente sem essa caixa.

`ShaderPass` **clona os uniforms e descarta a textura** passada no construtor: reatribua a textura depois de criar o
passe (tela preta no primeiro render). Todo `pow()` em shader próprio recebe base com `max(x, 0.0)`: base levemente
negativa gera NaN e a tela inteira fica preta depois do bloom. Para um composer dentro do acúmulo, desenhe o resultado
dele no alvo da cena a cada subquadro, ou aplique o efeito depois da soma quando ele não depender do tempo.

Onde está a melhor implementação de cada efeito no acervo: `acervo-codigo.md`.

## 10. Linha do tempo e animação

- **Todos os instantes num lugar só** (a tabela `T`, a lista `PLANOS`). Adaptar a duração é reescalar essa tabela ou
  aplicar `mapaDeTempo()` no começo de `estado(t)`, nunca caçar números pelo código. Se a duração nova for curta
  demais para ler, **corte momentos** em vez de acelerar.
- Um movimento = `curva(seg(t, inicio, duracao))`. Vários em cascata = `escalonar()`.
- Curvas pelo que a perícia mediu: brotar passando do ponto (`outBack`, 8% a 12% além), mola (`mola`), tranco que
  morre (`baque`), queda com quique (`quique`), entrada seca (um ou dois quadros). "Entra suavemente" não é
  especificação; "sobe 22% do corpo e assenta em 100 ms" é.
- **Troca de vínculo nunca é seca.** Quando um objeto passa de um estado a outro (sentado na pilha → preso na
  garra; no chão → na mão; solto → encaixado), as duas posições raramente coincidem no instante da troca. Um `if`
  seco vira um salto de dezenas de pixels, e dentro do obturador vira cópias em fila. Misture os dois estados
  (`mix` da posição e da rotação) numa janela de 0,2 a 0,4 s, sempre mais longa que o obturador.
- Nada fica 100% imóvel num plano que segura: respiração mínima (um giro de 1° ou 2°, uma flutuação de milímetros),
  desde que não brigue com a pausa medida.
- Personagem: juntas em grupos aninhados, **poses** como tabelas de ângulos, clipes encadeados (segurar, ir para a
  pose, andar por um trajeto), caminhada pela distância percorrida. O herói quase nunca fica de costas: móveis onde
  ele age ficam soltos perto da borda aberta e a câmera faz o papel do espelho.
- Laço: só senos com número inteiro de ciclos por laço (`fase()`), envelopes que cabem dentro do laço, duração múltipla
  de todos os ciclos. Nunca feche laço com fade.
- Crescimentos e montagens: some início + duração + a última entrada e confira que tudo termina antes do último meio
  segundo.

## 11. Render, desempenho e arquivo final

- Ciclo de trabalho barato: `node render.mjs at 2.5 --q=rascunho --w=960` (um quadro em menos de um segundo),
  `node render.mjs folha` (o filme inteiro em quadros pequenos), `node render.mjs video --de=3 --ate=5` (um trecho).
  O render completo é para o fim.
- O render lê a placa de vídeo no começo. Se aparecer "SwiftShader" ou "llvmpipe", o Chrome caiu no software: lento e
  com sombras diferentes.
- **Render parado quase nunca é o código:** é outro render na mesma máquina (de outra sessão). Confira antes de
  depurar. `--continuar` retoma de onde parou.
- Onde o tempo vai: subquadros × (sombra 4096 + passes de pós). Para acelerar o final sem perder qualidade: `sub`
  variável por trecho; passes caros fora do laço de subquadros; GTAO em meia resolução; superamostragem só se algo
  cintilar.
- Avisos do three aparecem no terminal como `[página]`. Leia: é assim que se descobre API removida.
- O arquivo: H.264 CRF 14, BT.709 marcado. Grão e trama em todos os pixels são o que mais pesa; para guardar no
  acervo, recomprimir em CRF 19 a 23 mantém SSIM acima de 0,97 com metade do tamanho.

## 12. Alfa, vertical e áudio

- **Alfa** (`node render.mjs video --alfa` → ProRes 4444): a cena não define `scene.background`; o pipeline soma em
  RGBA e não aplica vinheta nem grão. Nenhum pós em tela cheia (bloom, oclusão, foco em tela): todos sujam a borda
  do recorte. A profundidade vem da sombra e do material.
- **Vertical e quadrado:** troque o formato em `motion.json` e **recomponha, não corte**: fileiras viram pilhas,
  movimento lateral vira vertical, texto vai para a zona segura. Confira cada card no formato novo.
- **Áudio:** sintetizado por um script que lê os mesmos instantes da linha do tempo (uma tabela comanda imagem e
  som), mixado no fim com `ffmpeg -c:v copy -c:a aac -b:a 256k -shortest`. Diga na entrega se o som foi ouvido ou só
  medido.
- **Narração:** cada momento nasce na palavra que o introduz, nunca antes; o texto em tela fica só em palavras-chave;
  o filme sai sem a voz, com uma minutagem.

## 13. Os erros que não avisam

| Sintoma | Causa | Conserto |
|---|---|---|
| Tela inteira preta depois de ligar o bloom | NaN (`pow` com base negativa) espalhado pelo bloom | `max(x, 0.0)` em todo `pow`; limpar NaN antes do bloom |
| Tela preta no primeiro render com `ShaderPass` | o passe clonou os uniforms e perdeu a textura | reatribuir a textura depois de criar o passe |
| Sombra "suave" que sai dura | `PCFSoftShadowMap` removido no r187 | `PCFShadowMap` + `radius`, VSM, ou luz de área |
| Aviso do three que nunca aparece | o tipo do aviso no puppeteer é `'warn'`, não `'warning'` | o `render.mjs` do modelo já escuta os dois |
| Fresta de luz no contato do objeto com o chão | `bias` grande para a faixa da câmera de sombra | faixa justa, `bias` mínimo |
| Vidro vira disco preto | `AdditiveBlending` somando alfa | mistura personalizada só de cor |
| Tudo atrás do vidro fica lavado (pretos em 0,17 em vez de 0,02) | vidro feito de plano claro com opacidade baixa: soma um véu sobre a cena | vidro preto com mistura aditiva (só reflexo e brilho), nunca branco translúcido |
| Cromo ou metal de uma peça sai preto, ou igual aos outros | `envMapIntensity` do material é ignorado quando o ambiente vem de `scene.environment` (vale `scene.environmentIntensity` para todos) | dê `envMap` próprio ao material que precisa de outra força ou de outro ambiente |
| Sombra macia ou desfoque em espiral/rastros com poucos subquadros | sorteio por Halton em bases altas | sequência `r2()` de `lib/pos.js` |
| Texto de cabeça para baixo no reflexo | `Reflector` herdou as layers | layer de texto fora do espelho |
| Peça do avesso | perfil do torno de cima para baixo | de baixo para cima |
| Cor do vídeo diferente da dos cards | MP4 sem conversão para BT.709 | `render.mjs` do modelo |
| Card diferente do mesmo quadro no vídeo | estado acumulado | `node render.mjs determinismo` |
| Primeiro card com outra fonte | fonte não esperada | `carregarFontes` antes de `ready` |
| Rastro em cópias em vez de borrão | poucos subquadros para a velocidade | mais subquadros naquele trecho |
| Texto borrado ou com grão | texto dentro do acúmulo | texto em 2D por cima |
| Faixas no degradê do fundo | 8 bits + compressão | grão fino no fundo |
| Render "travado" | outro render na máquina | esperar; `--continuar` |
