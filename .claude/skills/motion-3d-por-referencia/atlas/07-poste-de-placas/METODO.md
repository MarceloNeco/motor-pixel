# Poste de placas: como este motion foi feito

*Aprovado em 16/11/2026. Este arquivo guarda as decisões, as medidas e os erros do caminho, para quem for refazer ou adaptar.*

## O que é

Um filme de 15 segundos, 1920×1080, 30 quadros por segundo, sem áudio, num plano só. Um poste de rua atulhado de placas e adesivos fica parado no escuro, e uma câmera grande-angular chicoteia em volta dele: mergulha na placa luminosa "a esquina", para no semáforo que abre do vermelho para o verde ("vai"), dá meia-volta até a placa da marca ("aiverso") e o disco "Opa!", sobe até o cone do topo, volta e encosta no "Pare", dá outra meia-volta até as placas cobertas de adesivos e recua para mostrar o totem inteiro.

Tudo é código three.js. Não há modelo 3D, imagem ou textura de arquivo: as formas são geradas no código e as texturas, inclusive todos os adesivos, são desenhadas em canvas. A única peça de fora é a fonte Inter, de licença aberta (OFL).

## De onde veio o método

A referência foi "Motion inspiration - House", publicado por MotionDesigners.Pro no Pinterest ([link](https://br.pinterest.com/pin/127578601939192693/)): um vídeo vertical de 15 s, sem cortes, de uma campanha de moda. O pedido foi recriar em horizontal, com os escritos em português, mantendo o design e o estilo. A perícia completa está em `pericia-da-referencia.md`.

O que ficou igual: o mecanismo (poste parado, câmera chicoteando), a paleta, a lente, a luz de flash, a ordem das paradas e o ritmo.

O que mudou de propósito:

| Na referência | Neste motion |
|---|---|
| vertical | horizontal, 16:9 |
| o nome da loja e o da campanha | "aiverso" e "a esquina" |
| sinalização em inglês | padrão brasileiro: Pare, EM OBRAS, MÃO ÚNICA, placa de rua |
| um tênis de marca pendurado | um capacete de obra branco |
| um colete refletivo jogado no topo | um cone de obra |
| adesivos com cara de fotografia | adesivos desenhados, de cor chapada |

## A cena, em números

As medidas estão em metros.

- **Poste:** 3,62 de altura, raio de 0,068, com cinco luvas, nove anéis e 36 adesivos enrolados. Base de 0,46 por 0,46.
- **Placas luminosas (4):** a comprida tem 1,30 por 0,38; as outras, de 0,60 a 0,62 de largura. De 7 a 8 cm de espessura, curvas de 18° a 28°, duas faces acesas.
- **Placas de chapa (15):** 1,4 cm de espessura (o octógono, 1,8). Octógono de 0,72, disco de 0,74, losango de 0,66 de ponta a ponta, placa da marca de 0,92 por 0,25.
- **Semáforo:** duas caixas de 0,33 por 0,37, lentes de 0,24 de diâmetro com pontos de LED em grade hexagonal.
- **Câmera:** de 1,14 a 4,05 do eixo do poste. Campo de visão vertical de 55° a 70°. 20 chaves, duas delas fora do filme (uma antes do começo e uma depois do fim), para a câmera já entrar e sair em movimento.
- **Lente:** distorção de barril de 0,2 (amplia o centro em 23%). A cena é renderizada em 2400×1350 e reduzida no último passe.
- **Desfoque:** obturador aberto em 80% do quadro; de 8 a 72 amostras por quadro, uma a cada 5 pixels de deslocamento. O filme inteiro somou 4.114 amostras.

## Decisões que definiram o resultado

- **Um construtor só para todas as placas.** Ele recebe um contorno convexo e devolve frente, costas e borda numa malha fina. Como a malha é fina, qualquer placa pode ser curvada ou torcida, e é isso que tira o ar de "plano com textura".
- **Luz de flash.** Uma luz presa à câmera, com a força corrigida pela distância ao poste, dá o claro de perto e o preto de longe da referência. Quatro refletores fixos em volta garantem forma e sombra de qualquer lado. Como nada se move além da câmera, as sombras são calculadas uma vez.
- **A névoa é um objeto.** Um cartaz de luz fica sempre atrás do poste, de frente para a câmera. Por ser um objeto da cena, o poste o encobre e o chão o espelha, sem linha de horizonte.
- **Adesivo não acende.** Nas placas luminosas, os adesivos são recortados em preto no mapa de emissão e desenhados só no mapa de cor. Eles aparecem como coisas coladas num acrílico aceso.
- **Desfoque por soma, não por filtro.** Cada quadro é a soma de várias imagens da cena tiradas ao longo da exposição, somadas em 32 bits. A mesma soma serve de suavização de serrilhado, com um deslocamento de sub-pixel por amostra.
- **O giro mora nos chicotes.** A câmera só gira de verdade na abertura e nos dois chicotes; no resto do tempo ela deriva. No meio do primeiro chicote ela passa a menos de meio metro da ponta da placa da marca, e é esse rasante que faz o pico.
- **Mapa de tons que não lava a cor.** O Khronos PBR Neutral comprime o brilho mantendo o laranja laranja. Com os mapas mais comuns ele puxava para o amarelo.
- **Textos num bloco só.** Toda palavra em tela vem do bloco `COPY`, no começo de `codigo/src/main.js`.

## A linha do tempo final

| Janela | O que a câmera mostra |
|---|---|
| 0,0 – 1,0 s | totem em três quartos, mergulhando na placa luminosa |
| 1,0 – 1,6 s | "a esquina" em mais de meio quadro |
| 1,6 – 2,75 s | passagem para o semáforo |
| 2,75 – 3,9 s | semáforo de frente; o verde acende aos 3,15 s; desliza até o "Pare" entrar |
| 3,9 – 4,85 s | chicote 1 |
| 4,85 – 6,1 s | "aiverso", "Opa!" e "EM OBRAS", com recuo lento |
| 6,1 – 7,3 s | sobe até o cone |
| 7,3 – 9,8 s | volta por fora e encosta no "Pare"; o semáforo fecha aos 7,4 s |
| 9,8 – 10,8 s | chicote 2 |
| 10,8 – 11,4 s | placas de adesivo, embaixo |
| 11,4 – 12,95 s | sobe devagar até o "Opa!" |
| 12,95 – 15,0 s | recua até o totem inteiro e segue derivando |

## A ordem em que foi feito

1. Perícia da referência: estrutura, design e movimento medido.
2. Cena construída e conferida em quatro vistas paradas, uma de cada lado.
3. Onze quadros-chave renderizados e corrigidos.
4. Quatro versões do vídeo, cada uma seguida de folhas de quadros e do teste de movimento. A última foi regravada uma vez para acertar a faixa de cor.
5. Vídeo aprovado pelo Felipe.

Os quadros-chave não passaram por aprovação separada antes da animação: o vídeo foi entregue direto e aprovado. A crítica independente prevista no método também não foi feita.

## Erros do caminho

- **Primeira imagem toda estourada.** As luzes das placas luminosas e do semáforo ficavam a 12–30 cm das superfícies e queimavam tudo. Foram reduzidas a uma fração do valor inicial.
- **Linha de horizonte.** A névoa começou pintada numa esfera de fundo e deixava uma linha onde o chão começava. Virou o cartaz atrás do poste.
- **Letras se engolindo.** Com espaçamento de −7,5%, o "ui" de "esquina" virava um borrão. Ficou em −5,5%.
- **Haste em cima do texto.** A haste da placa luminosa corria pelas costas dela, que também são uma face com texto. Passou a entrar pela ponta mais próxima do poste.
- **Ritmo espalhado.** No primeiro vídeo os chicotes não se destacavam: amplitude de 2,3×, com nove picos. A câmera viajava demais entre uma placa e outra. A coreografia foi reescrita para concentrar o giro em três momentos.
- **Placas lavadas.** Ao subir a emissão para o brilho pegar, o laranja ficou rosado e o texto perdeu contraste. A emissão voltou para 1,7 e o brilho passou a agir a partir de 0,85, com força de 0,18.
- **Faixa de cor.** O primeiro arquivo saiu em faixa cheia. O render passou a converter para BT.709 de faixa limitada.

## Resultado do teste de movimento

| Medida | Este motion | Referência |
|---|---|---|
| Cortes secos | 0 | 0 |
| Amplitude (pico ÷ mediana) | 3,0× | 3,0× |
| Maiores picos | 10,0–10,5 s · 4,0–4,5 s · depois 12,0 s e 0,5 s, quase empatados | 4,5 s · 10,5 s · 0,5 s |
| Trechos mais calmos | 3,0 s e 14,5–15,0 s | 3,0 s e 14,0–14,5 s |
| Tempo em quase-parada | 10% | 0% |

O script marca reprovação em quase-parada porque a meta padrão dele é 25%. A referência tem 0% e não cumpre essa meta; aqui ela não se aplica. O teste mede ritmo, não a qualidade da imagem.

## Limites conhecidos

- Os adesivos são desenhos de cor chapada. Os da referência parecem fotografados e são mais variados.
- O último segundo é mais calmo que o da referência, e o nosso maior pico é o segundo chicote, não o primeiro.
- Entre 12,0 e 13,5 s a subida passa rente ao losango amarelo e mede mais agitada que o mesmo trecho da referência.
- O primeiro quadro corta o topo do semáforo.
- A forma de escrever "aiverso" (minúsculas, peso 700) foi escolha de quem construiu, não saiu de um manual de marca.
- A fonte Inter da pasta é um recorte latino: cobre o português, mas não outros alfabetos.
- O reflexo no chão é fraco e aparece pouco, quase só no plano final.
- Não existe versão vertical nem áudio.

## Como rodar

Precisa de Node, ffmpeg e Google Chrome instalados.

```bash
cd codigo
npm install
node render.mjs cards
node render.mjs video
```

- `cards` gera os onze quadros-chave em `codigo/cards/`.
- `video` gera `codigo/out/poste-de-placas.mp4`. No Mac em que foi feito (Apple M5), os 450 quadros levaram de 90 a 120 segundos.
- `node render.mjs at 3.5 10.2` gera quadros avulsos desses instantes em `codigo/out/teste/`.
- `node render.mjs view 180 3.4 2.2 2.1` gera uma vista parada (azimute, raio, altura da câmera, altura do alvo) em `codigo/out/vistas/`.
- Se o Chrome estiver em outro lugar, defina a variável `CHROME_PATH` com o caminho do executável.
- Para trocar os textos, edite o bloco `COPY` no começo de `codigo/src/main.js`. Para mexer na câmera, edite a tabela `CAM`.
