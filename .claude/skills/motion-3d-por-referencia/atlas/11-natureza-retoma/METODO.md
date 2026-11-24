# Natureza retoma: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um clipe de 8 segundos, 1920×1080, 30 quadros por segundo, sem áudio e sem texto, num plano só e com a câmera parada. Um controle de videogame flutua, gira devagar e é tomado por musgo e flores: as manchas partem de alguns pontos, avançam pela superfície, e as flores sobem, crescem e abrem por cima.

Sai em duas versões: MP4 com o fundo em degradê e ProRes 4444 com canal alfa (o objeto solto).

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo. O corpo do controle é esculpido por uma função de distância; as flores, as lâminas e as hastes são geometrias pequenas, repetidas dezenas de milhares de vezes.

## De onde veio o método

A referência foi o [Pack Of 6 Nature Reclaimed Objects On Alpha](https://motionarray.com/stock-motion-graphics/pack-of-6-nature-reclaimed-objects-on-alpha-4237257/), do Motion Array: seis objetos (skate, tênis, bloco de concreto, bola, crânio e controle) tomados por musgo e flores, entregues com canal alfa. A perícia completa está em `pericia-da-referencia.md`.

Da referência veio o método. O controle é um desenho próprio e genérico, sem marca; as manchas, as flores e as cores são geradas pelo nosso sistema. Nenhum quadro, modelo ou textura dela está no projeto.

**Só o controle foi feito.** Os outros cinco objetos do pacote não existem nesta versão.

## A cena, em números

As medidas estão em unidades da cena. O controle tem 3,48 de largura, 2,24 de altura e 1,01 de profundidade.

- **Corpo:** soma suave de um elipsoide central (raios 1,25 × 0,66 × 0,36), uma caixa arredondada que dá a face plana de baixo, dois elipsoides de ombro (0,74 × 0,70 × 0,38) e dois punhos em cápsula que afina (raio de 0,50 para 0,38). A frente é aparada por um plano quase reto a 0,33. Malha por marching cubes com célula de 0,025: 36 mil vértices.
- **Comandos:** duas alavancas (aro, haste, topo côncavo e friso), direcional em cruz sobre um prato, quatro botões de face, um botão central e dois pequenos, botões de ombro e gatilhos. Todos pousados na superfície e alinhados à normal dela.
- **Materiais:** plástico `#c9c9ce` com verniz na frente; a metade de trás da carcaça 60% mais escura; linha de junção escura entre as duas; borracha `#3b3c41` nas alavancas e no direcional; botões foscos `#2c2d31`.
- **Sementes:** 11 (7 de flor e 4 de musgo), cada uma com centro, três raios, hora de início e duração. Três zonas de exclusão em volta das alavancas e do direcional.
- **Natureza:** manta de musgo de 0,022 de altura, 106 mil tufos de 5 lâminas, 30 mil flores em três formas e 30 mil hastes. Área do corpo: 16,4.
- **Flores:** raio de 0,011 a 0,034 (4% delas ganham mais 0,012); haste de 0,03 a 0,20; inclinação de até 31 graus em relação à superfície.
- **Tufos:** 0,036 no musgo e 0,05 debaixo das flores, com variação de 70% a 140%.
- **Câmera:** perspectiva, 24 graus de campo de visão, a 9,6 de distância, parada.
- **Luz:** uma direcional quente (`#fff0de`, intensidade 3,8) do alto e da esquerda, com sombra de 4096; uma de recorte atrás à direita; ambiente de estúdio escuro com quatro painéis e uma faixa vertical.
- **Fundo:** degradê radial em CSS, de `#f1e9e3` (embaixo, à esquerda) a `#100807`, passando por `#6f3d27`, com um grão fino por cima dele e por baixo do objeto.

## Decisões que definiram o resultado

- **O crescimento mora no shader.** Cada instância guarda o instante em que nasce. O vértice é escalado a partir de um único tempo global e, na flor, interpolado entre dois estados guardados na mesma malha: botão fechado e flor aberta. Nenhuma matriz é recalculada por quadro.
- **A sombra usa o mesmo crescimento.** O material de profundidade recebe o mesmo trecho de shader; sem isso a sombra da flor apareceria antes da flor.
- **O campo de crescimento é contínuo.** Para cada ponto da superfície há um "instante de chegada" (distância à semente, torta por ruído) e um "quanto está dentro da mancha". A manta usa os dois por vértice, então a borda anda suave em vez de pular de triângulo em triângulo.
- **Manta por baixo dos tufos.** A superfície do corpo é copiada, estufada e pintada de verde escuro onde a natureza chegou. Sem ela o plástico aparece entre as lâminas e o musgo parece ralo.
- **Relevo em três ruídos.** Um ruído médio decide a altura das hastes (montes), um mais largo abre clareiras nas manchas, e as flores de haste curta saem mais escuras. É o que tira o aspecto de tapete.
- **Sem pós-processamento.** Nada de oclusão de ambiente, brilho ou desfoque em tela cheia: qualquer um deles sujaria a borda do alfa. A profundidade vem da sombra, da raiz escura das lâminas e da flor baixa mais escura.
- **Fundo fora da cena 3D.** O degradê é uma camada de CSS atrás de uma tela transparente. No modo alfa ele simplesmente não existe.
- **Dobro da resolução.** A cena é desenhada em 3840×2160 e reduzida na captura, para as flores miúdas não cintilarem.
- **Carcaça em duas cores.** A metade de trás cinza e a linha de junção fazem o controle ler como produto e dão contraste quando ele gira.

## A linha do tempo final

O giro vai de 34 graus para a esquerda a 25 para a direita, a 7,4 graus por segundo, com 6 cm de flutuação.

| Janela | O que acontece |
|---|---|
| 0,0 – 0,4 s | o controle limpo, só girando |
| 0,4 – 2,0 s | primeiro musgo embaixo do direcional (0,4 s); primeira mancha de flor em cima dos botões (0,6 s); a do topo (1,05 s) |
| 2,0 – 3,5 s | as ilhas de musgo se encontram; os botões de flor estão de pé; a maior parte das flores abre entre 3,0 e 3,5 s |
| 3,5 – 5,0 s | a cor toma o topo e desce pelas laterais |
| 5,0 – 6,5 s | duas manchas de flor que nascem tarde (2,5 e 2,9 s) passam por cima do musgo; as desgarradas brotam no plástico |
| 6,5 – 8,0 s | nada novo brota depois de 6,0 s; as últimas pétalas abrem até 7,5 s |

Cada flor: a haste sobe em 0,6 s, o botão cresce em 0,7 s (passa do tamanho e volta) e as pétalas abrem em 1,2 s. Cada tufo sobe em 0,85 s.

## Como o render funciona

Um script Node (`render.mjs`) sobe um servidor local, abre a página no Chrome sem janela, chama `renderAt` quadro a quadro, salva cada imagem e junta tudo com o ffmpeg. Os 240 quadros do MP4 levaram cerca de 5 minutos e os do alfa, cerca de 8, num Mac que estava rodando outros renders ao mesmo tempo.

## A ordem em que foi feito

1. Perícia da referência no navegador, quadro a quadro.
2. Controle esculpido por código e sistema de musgo e flores.
3. Comparação lado a lado com um quadro da referência, três rodadas de ajuste.
4. Página de cards.
5. Crítica independente (um crítico sem contexto, com dois quadros da referência): **reprovado.**
6. Correções e nova página de cards. **Aprovada pelo Felipe.**
7. Render das duas versões. **Vídeo aprovado.**

## Erros do caminho

- **Peças do avesso.** O perfil dos botões foi escrito de cima para baixo e o torno do three.js espera de baixo para cima. As peças ficaram invisíveis de frente e pareciam buracos claros no corpo.
- **Punhos compridos demais.** A primeira forma parecia um controle de brinquedo. O corpo ficou mais largo e os punhos mais curtos e grossos.
- **Direcional cortado.** O prato caía numa parte curva da face e era atravessado por ela. Entrou uma caixa arredondada no corpo para dar área plana ali.
- **Flores grandes e iguais.** Liam-se uma a uma, como adesivo, e cobriam o topo numa coroa de espessura constante. Ficaram 45% menores e em dobro, com montes, clareiras e desgarradas.
- **Musgo escuro e de lâmina grande.** Depois de uma comparação eu escureci demais e virou uma massa quase preta. Lâminas pela metade, mais que o dobro da densidade, verde médio com ponta clara.
- **Botões de flor em bolinha.** Milhares de esferinhas coloridas pareciam miçanga. Saíram; o botão fechado é a própria flor.
- **Corpo com cara de massinha.** Entraram o verniz, as duas cores, a linha de junção e as alavancas com topo côncavo.
- **Alfa opaco.** O primeiro quadro "com alfa" saiu sem transparência porque o fundo da página continuava preenchido. Agora o modo alfa limpa a página inteira.
- **Grão em cima do objeto.** A camada de grão estava por cima da cena e pontilhava o plástico. Desceu para baixo dela.
- **Crescimento passando do fim.** Numa versão a última flor nascia aos 6,8 s e abria depois do último quadro. As durações das sementes foram encurtadas.
- **Renders travados.** Duas vezes o render ficou minutos sem sair do lugar. Não era o código: havia vários renders de outras sessões na mesma máquina.

## Resultado do teste de movimento

| Medida | Este motion | Leitura |
|---|---|---|
| Amplitude (pico ÷ mediana) | 1,8× | perfil quase plano, de propósito |
| Tempo em quase-parada | 0% | o giro e o crescimento nunca param |
| Trecho mais cheio | 3,0 a 3,5 s | quando a maior parte das flores abre |
| Cortes | 0 | um plano só |

O teste mede ritmo, não a qualidade da imagem. Aqui a referência é contínua e sem pausas, então o critério foi não ter salto nem trecho parado.

## Limites conhecidos

- Só o controle existe. Bola, bloco de concreto e skate saem por código no mesmo molde; tênis e crânio são formas orgânicas que por código ficariam abaixo deste nível.
- O movimento da referência foi estimado de olho, parando a prévia no navegador. O arquivo dela não foi baixado, então não houve comparação automática.
- A segunda passada da crítica independente, sobre a versão corrigida, não foi feita.
- A cintilação das flores miúdas não foi medida. Se aparecer numa tela grande, a saída é renderizar com o triplo da resolução (`--q="ss=3"`).
- O arquivo ProRes foi conferido pelo formato (4444 com alfa, 240 quadros) e por um quadro parado, não aberto num editor.
- O controle não tem os detalhes finos de um modelo de produto (textura do punho, frisos, parafusos). O sistema de musgo e flores aceita qualquer malha, então dá para trocar o corpo por um modelo pronto.
- A versão com alfa (227 MB) não está nesta pasta; ela é gerada pelo comando abaixo.
- Não existe versão vertical nem áudio.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
node render.mjs video --alpha
```

- `cards` gera as seis imagens paradas em `codigo/cards/controle/`.
- `video` gera `codigo/out/natureza-retoma-controle.mp4`.
- `video --alpha` gera `codigo/out/natureza-retoma-controle-alpha.mov` (ProRes 4444, fundo transparente).
- `node render.mjs at 3.0 6.0` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `--q="vo=1010,230,576,324"` renderiza só um recorte ampliado do quadro, para olhar de perto.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Para mudar onde a natureza nasce, edite a lista `sementes` em `codigo/src/objetos/controle.js`. Para mudar tamanho e quantidade de flores e tufos, edite `codigo/src/vegetacao.js`.
- Para outro objeto, crie um arquivo em `codigo/src/objetos/` que devolva o grupo de malhas, a geometria do corpo, as sementes, as exclusões, a paleta e o fundo, e registre-o em `OBJETOS` no `main.js`.
