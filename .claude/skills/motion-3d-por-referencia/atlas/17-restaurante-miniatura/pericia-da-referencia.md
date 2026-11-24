# Perícia da referência: "Miniature Restaurant"

Fonte: [shot 27850125 no Dribbble](https://dribbble.com/shots/27850125-Miniature-Restaurant). O vídeo é de terceiros (gerado por IA, com marca d'água "Veo") e **não entra neste acervo**: ficam aqui só o link e o que foi medido.

Medido sobre o arquivo de 8,00 s, 1280×720, 24 fps, 192 quadros, com áudio AAC estéreo.

## Estrutura

**O mecanismo, em uma frase:** numa esquina de cidade em miniatura vista de cima, uma mão gigante crava uma bandeirinha num terreno vazio e, em time-lapse, o lugar vira um restaurante com um hambúrguer gigante no telhado.

Um plano só, câmera travada (deriva medida de no máximo 2 px em 8 s), sem corte. A mesma bandeirinha aparece duas vezes: primeiro no terreno e depois no topo do pão.

| Quadro | Tempo | O que acontece |
|---|---|---|
| q0–q9 | 0,00–0,38 | táxi da esquerda sai e dobra a esquina; borrão de carros no canto inferior direito |
| q11–q17 | 0,46–0,71 | ônibus chega pela esquerda e para |
| q18–q27 | 0,75–1,12 | operários se juntam no meio do terreno |
| q20–q25 | 0,83–1,04 | a mão entra pelo topo em 2 quadros, paira pequena segurando o palito e some entre dois quadros |
| q26–q32 | 1,08–1,33 | a bandeira fica em pé; em q28 o anel de vidro e os primeiros montantes surgem de uma vez |
| q33 | 1,38 | treliça de madeira completa; a bandeira some |
| q35–q39 | 1,46–1,62 | o ônibus vai embora |
| q40–q46 | 1,67–1,92 | a mão volta com a bandeira e paira descendo devagar |
| q47–q49 | 1,96–2,04 | o hambúrguer se materializa em cerca de 3 quadros; o salão acende; a mão some |
| q58 / q60 | 2,42 / 2,50 | o letreiro acende / a placa de aberto acende |
| q66–q88 | 2,75–3,70 | calmaria: a energia de movimento cai a ~1,2 |
| q80–q92 | 3,3–3,8 | gente se junta no pátio |
| q92–q108 | 3,83–4,5 | guarda-sóis; o táxi parado vai embora (q94) e um carro branco chega e fica (q98) |
| q142–q152 | 5,9–6,3 | um carro escuro para na faixa e segue |

## Design

- **Luz:** noite quente. Um foco âmbar sobre a esquina e o resto caindo no escuro; só as luzes locais (postes, vitrines, faróis) aparecem, e as distantes viram bokeh grande.
- **Chão:** asfalto escuro e molhado, com reflexo esticado na vertical; calçada de pedras bege desencontradas; faixas e letras brancas pintadas.
- **Árvores:** de maquete, com copa de espuma e floquinhos finos, topo amarelado.
- **Escala:** pessoas enormes em relação ao restaurante (a vitrine tem uma pessoa de altura); carros pequenos, com perfil de sedã.
- **Câmera:** lente longa, ~24° de inclinação, profundidade de campo de maquete (primeiro plano e fundo borrados).
- **Texto em tela:** só dentro do mundo (letreiro 3D, flâmula, placas). Nenhum texto sobreposto.

## Movimento (medido com `pericia-movimento.py` e com as ferramentas de `codigo/ferramentas/`)

- **Energia de movimento** (diferença média entre quadros consecutivos, 320×180): média 5,05, mediana 4,97, pico 8,25 (amplitude 1,9×), 6 picos e 0% do tempo em quase-parada. Nenhum corte duro.
- É um time-lapse contínuo: sempre há algo andando, então não existe silêncio no quadro. A calmaria de 2,75 a 3,5 s é a única respiração.
- **Pessoas:** quase não andam. Ficam em grupos que mudam de lugar aos saltos, de um quadro para o outro.
- **Trânsito:** passagens rápidas em primeiro plano (borrões amarelos e vermelhos), fila lenta de faróis ao fundo, numa rua que sobe de frente para a câmera.
- **Pela região do quadro** (energia média, parado de 3,5 a 8 s): topo 3,85 · meio-esquerda 4,77 · meio-direita 4,10 · base-esquerda 4,60 · base-direita 9,65. O canto inferior direito é o mais agitado (carros subindo a rua da direita).

## Cor (média dos quadros, sRGB)

| | Abertura | Plano final |
|---|---|---|
| R : G : B | 1 : 0,74 : 0,49 | 1 : 0,67 : 0,41 |
| Luminância p25 / p50 / p75 | 0,127 / 0,218 / 0,365 | 0,122 / 0,227 / 0,360 |

## Áudio

Estéreo, 48 kHz, nível médio por janela entre −30 e −22 dBFS. O instante mais forte é a chegada do hambúrguer, perto de 2,05 s (cerca de −15 dBFS numa janela de 43 ms). Há transientes largos também entre 1,0 e 1,4 s (a obra), perto de 2,4 a 2,7 s, de 3,7 s e de 4,8 s. Por baixo de tudo corre um rumor grave de cidade, contínuo. O nosso áudio é sintetizado do zero, sobre esses instantes; o som original não é usado.

## O que o nosso NÃO copia

O nome (a referência diz "BIG BURGER", o nosso diz "MEGA BURGER"), os textos e as placas (todos em português e nossos), a transformação borrada do hambúrguer (as nossas camadas caem em rajada) e o vídeo em si. Copiamos o método: o mecanismo, a ordem dos beats, a câmera travada, a luz, o ritmo e a escala.
