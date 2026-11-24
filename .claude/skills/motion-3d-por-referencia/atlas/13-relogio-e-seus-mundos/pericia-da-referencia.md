# Perícia da referência: relógio que vira o mundo de quem usa

Fonte: https://br.pinterest.com/pin/127578601938453265/. Clipe de 12 s, 720×1280 (vertical), 30 qps, em laço. Um smartwatch em três cores (laranja, azul, rosa), cada cor com um universo de objetos (treino, viagem, pet).

## Estrutura
- **Mecanismo:** o relógio se monta girando no ar, encara a câmera e, num giro, explode no mundo de coisas de quem usa aquela cor; as coisas se recolhem e viram o próximo relógio, e o cenário troca de cor junto.
- **Arco:** três ciclos iguais de 4 s. O último quadro emenda no primeiro (o fundo do começo já é o da última cor).
- **Emendas:** nenhum corte seco. Toda troca é escondida num giro rápido com borrão de movimento.

### Um ciclo (medido quadro a quadro)
| Janela | O que acontece |
|---|---|
| 0,0 – 0,3 s | o relógio entra pequeno, de lado, girando rápido (borrado), com a pulseira em laço atrás |
| 0,2 – 0,7 s | o aro com o cristal chega voando da esquerda e encaixa na caixa |
| 0,8 – 1,6 s | o relógio vira de frente e cresce (câmera aproxima); o cenário passa da cor anterior para a cor atual |
| 1,6 – 1,9 s | pausa: relógio de frente, grande |
| 1,9 – 2,1 s | giro rápido, o relógio encolhe e some no borrão |
| 2,1 – 2,5 s | os objetos explodem do centro, passam do ponto e assentam; a câmera recua e mostra o aparador; uma bola grande passa desfocada perto da lente |
| 2,5 – 3,5 s | os objetos flutuam quase parados, em câmera lenta |
| 3,5 – 4,0 s | tudo gira e se recolhe no centro, de onde sai o próximo relógio |

## Design
- **Herói:** relógio de aço polido, aro trabalhado, coroa, pulseira que fecha um laço como se estivesse no pulso. O mostrador muda de personalidade a cada cor.
- **Mundo de objetos:** uns 15 objetos de plástico fosco, de brinquedo, mais miudezas (parafusos, pastilhas pretas, bolinhas). Um cartão de vidro escuro com uma leitura do relógio ("88 BPM"). Uma corda costura o conjunto.
- **Cor:** cada ciclo é monocromático com um segundo tom quente, branco, aço e vidro escuro. O fundo é o tom pastel da cor do relógio.
- **Cenário:** parede pastel com faixas diagonais de luz e um aparador com objetos de casa, tudo bem desfocado. Só o herói está em foco.
- **Luz:** suave, clara, de cima e da esquerda, com pouca sombra.

## Movimento (medido com pericia-movimento.py)
| Medida | Referência | Meta do nosso |
|---|---|---|
| Amplitude (pico ÷ mediana) | 2,8× | ≥ 2,0× |
| Tempo em quase-parada | 8% | (a referência quase não para; o script pede ≥ 25%) |
| Picos | 6 (um a cada 2 s) | ≥ 4 |
| Cortes secos | 0 | 0 |

Perfil: pico em 2,0 s (explosão) e em 4,0 s (recolhida + entrada), repetindo; parada em 3,0 s.

## O que levamos (método) e o que mudamos
| Papel | Na referência | No nosso |
|---|---|---|
| Formato | vertical 720×1280 | horizontal 1920×1080, recomposto (conjunto de objetos mais largo que alto, aparador de ponta a ponta) |
| Cores do relógio | laranja, azul, rosa | verde, amarelo com grafite, violeta |
| Mundos | treino, viagem, pet | trilha, música, sono |
| Mostradores | analógico, cronógrafo, gato ilustrado | analógico com bússola, digital com anel de progresso, céu de noite com lua |
| Cartão de vidro | "Heart rate 88 BPM" | "Trilha 4,2 km", "Tocando agora 02:14", "Sono 7h 42 min" (em português) |
| Corda | corda de pular, cabo, guia | corda de escalada, cabo com plugue, cordão de luzes |
| Aro | torcido / cerâmica azul / liso | serrilhado / escala com números / liso |

## O que NÃO copiamos
A marca e o desenho do relógio da referência, os mostradores, os objetos (halter, mala, óculos de pet), os textos e as três cores. O vídeo da referência não fica nesta pasta; só o link.
