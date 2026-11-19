# 02 — Referência dos módulos

## nucleo

| Função | Faz |
| --- | --- |
| `modoLeve()` | `true` em aparelho fraco (pouca memória) ou se o usuário pediu (`localStorage motor.modoLeve = 1`) |
| `reduzirMovimento()` | `true` se o sistema pede menos animação |
| `nitidez()` | Densidade de pixels a usar (até 2; 1 no modo leve) |
| `aCadaQuadro(f)` | Inscreve `f(dt)` no laço único; pausa com a aba escondida; devolve "sair" |
| `aoMudarTamanho(el, f)` | Chama `f(largura, altura)` quando o elemento muda de tamanho |

## vetor

| Função | Faz |
| --- | --- |
| `carregarSVG(url, destino)` | Busca o arquivo SVG e coloca no elemento; devolve o `<svg>` |
| `realcar(svg, {principal, apoio, pulsar})` | Acende partes pelo id: principal forte (pulsa), apoio claro. Cores pelas variáveis CSS `--mg-ativo` e `--mg-apoio` |
| `apagar(svg)` | Tira os realces |
| `aoTocarParte(svg, ids, f)` | Avisa `f(id)` quando uma das partes é tocada |
| `moverPeca(svg, id, {girar, x, y, eixo, duracao})` | Gira ou move uma peça em volta de um ponto, com animação |
| `mostrarPose(svg, poses, nome)` | Mostra só a pose pedida, com transição cruzada |
| `neon(svg, cor, ligado)` | Contorno brilhante |

## zoom

`criarZoom(svg, {maximo})` devolve `{ ajustar(), focar(id, margem) }`. Pinça, arrastar e roda do mouse já funcionam ao criar.

## cena3d

`criarCena(canvas, {fundo, neblina, sombra, girar, camera, alvo})` devolve `{ THREE, renderer, scene, camera, sol, controles, leve, aCadaQuadro(f), destruir() }`.
Receita: cor ACES, sombra macia, luz céu + sol de cima à esquerda, nitidez limitada. `girar: true` liga girar e dar zoom com o dedo.

## personagens3d

`criarPersonagem(loader, url, scene)` devolve `{ tocar(nome), tocarUmaVez(nome, depois), expressao(nome, peso), atualizar(dt) }`. Troca suave entre animações; expressões do rosto por cima; piscar automático.

## camera3d

`criarCameras(camera, alvo, paredes, tamanho)`: modos `atras`, `dentro` (primeira pessoa) e `cima` (sobe em 1,5 s, fica 3 s, volta em 1,5 s), sem atravessar paredes.

## realce3d

`criarRealce(modelo, cena, {corAtivo, corApoio})` devolve `{ nomes(), realcar({principal, apoio, pulsar}), apagar(), aoTocarParte(nomes, f), focar(nome, distancia), destruir() }`.
**Mesmo vocabulário do `vetor`**: o app troca entre vetorial e 3D sem mudar a lógica.

## holograma

`materialHolograma(cor)`, `vestirHolograma(modelo, acesos, cor)`, `criarCenaHolograma(canvas)` (fundo preto, chão que reflete, brilho; sem brilho no modo leve) e `controlarAparelho(modelo)` → `{ encosto(graus), pino(n), movimento(0..1) }` para peças nomeadas `encosto`, `pino`, `placa_NN`, `puxador`.

## efeitos

`pulinho(el)`, `tremer(el, forca)`, `brilhos(x, y, quantos, cor)`, `pontos(x, y, texto)`. Respeitam "reduzir movimento".

## offline

`listarArquivos(...modulos)` devolve todos os arquivos (módulos, dependências e bibliotecas) para o service worker do app guardar. Modelo em `exemplos/sw-de-um-app.js`.
