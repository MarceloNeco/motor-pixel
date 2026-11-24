# Perícia da referência

Referência: "Motion inspiration - House", publicado por MotionDesigners.Pro no Pinterest.
Link: https://br.pinterest.com/pin/127578601939192693/
Medido: 15,0 s, vertical (720×1278 na cópia analisada), 30 quadros por segundo, sem cortes.
O vídeo da referência não fica nesta pasta, só o link e as medidas.

## O mecanismo, em uma frase

Um poste de rua atulhado de placas e adesivos fica parado no escuro, e uma câmera grande-angular
chicoteia em volta dele: cada chicote termina colado numa placa diferente, até a câmera recuar e
mostrar o totem inteiro.

## Estrutura (um plano só)

| Janela | O que a câmera mostra |
|---|---|
| 0,0 – 0,6 s | o totem em três quartos, já em movimento |
| 0,6 – 2,0 s | mergulho na placa luminosa laranja, enorme e em ângulo |
| 2,0 – 3,6 s | semáforo de frente: vermelho aceso, depois verde com uma palavra na lente |
| 3,6 – 5,0 s | primeiro chicote, passando pela placa de pare até o outro lado |
| 5,0 – 7,6 s | a placa preta da marca e o disco vermelho; depois sobe até o topo |
| 7,6 – 9,6 s | volta pelo semáforo de lado e encosta na placa de pare |
| 9,6 – 11,0 s | segundo chicote, descendo até as placas cobertas de adesivos |
| 11,0 – 13,0 s | sobe de novo pelo disco vermelho e pelo losango amarelo |
| 13,0 – 15,0 s | recua até o totem inteiro, com a base, e assenta |

## Design

- **Fundo:** preto, com uma névoa vermelha escura só atrás do poste. Chão preto polido, com reflexo fraco.
- **Poste:** tubo de aço cromado em segmentos, com abraçadeiras, e adesivos enrolados nele.
- **Placas luminosas:** caixas de acrílico laranja acesas por dentro, curvas, com o nome em duas linhas
  numa grotesca pesada, inclinada e de letras coladas, em marrom quase preto.
- **Placa da marca:** chapa preta de borda branca, nome em minúsculas, bold, branco.
- **Semáforo:** amarelo, duas lentes de pontos de LED. A de cima acende vermelha; a de baixo, verde, com uma palavra.
- **Placas de trânsito:** octógono vermelho de borda branca, disco vermelho com uma interjeição, losango
  amarelo de obra, triângulos e chapas cobertos de adesivos, um disco holográfico colado no octógono.
- **Topo:** um colete laranja refletivo jogado sobre o poste.
- **Adesivos:** em tudo. Recorte branco, cores chapadas, rabiscos de canetão.
- **Paleta:** laranja aceso, vermelho, amarelo e preto; branco e azul só em detalhe pequeno.
- **Lente:** grande-angular com distorção de barril e desfoque de movimento forte nos chicotes.
  Luz de flash: o que está perto estoura um pouco, o que está longe cai no preto.

## Movimento, medido

Medido com `pericia-movimento.py` (arquivo `movimento.json`).

| Medida | Referência |
|---|---|
| Cortes secos | 0 |
| Amplitude (pico ÷ mediana) | 3,0× |
| Tempo em quase-parada | 0% (a câmera nunca para) |
| Picos | 0,5 s · 4,0–4,5 s (o maior) · 10,0–10,5 s |
| Trechos mais calmos | 3,0 s (semáforo) e 14,0–14,5 s (final) |

## Metas para o nosso filme

- Um plano só, sem corte.
- Amplitude de pelo menos 2,1×, com dois chicotes grandes perto de 4,5 s e 10,5 s e uma entrada já em movimento.
- A câmera nunca para: nos trechos calmos ela continua derivando.
- Os dois trechos mais calmos são o semáforo e o final.

## O que o nosso filme não copia

- As marcas da referência (o nome da loja e o da campanha) não aparecem. A placa preta leva "aiverso"
  e a luminosa leva "a esquina".
- O tênis pendurado (de marca) virou um capacete de obra. O colete do topo virou um cone.
- A sinalização passou para o português e para o padrão brasileiro: PARE, EM OBRAS, MÃO ÚNICA, placa de rua.
- Formato horizontal, 1920×1080.
