# 07 — Arte com IA, sem ilustrador

## Passo a passo

1. **Bíblia de estilo em 5 linhas**, repetida no começo de todo prompt (estilo, luz de cima à esquerda, contorno colorido fino, paleta com códigos, fundo).
2. **Cenários primeiro:** sem pessoas, centro livre e mais claro para o personagem; 2560×1440 e versão menor.
3. **Folha de referência do personagem:** frente, costas e rosto de perto. Vira a referência de tudo.
4. **Peças em camadas:** gerar a peça **em cima da imagem base** (edição de imagem), mesma pose, mesmo enquadramento; depois recortar só a peça com fundo transparente.
5. **Peças em tons de cinza** quando forem recoloríveis.
6. **Alinhamento:** todas as camadas na mesma tela (ex.: 2048×4096), com um ponto de referência fixo (umbigo, pés).
7. **Revisão humana:** mãos, olhos, boca e simetria; montar cada peça sobre a base antes de entrar no jogo.
8. **Peso:** WebP/AVIF qualidade 80; conferir o orçamento (guia 10).

## Consistência

- Mesma ferramenta, mesma imagem de referência de estilo, mesma pose, mesma luz.
- Nunca citar nome de jogo, estúdio, personagem de marca ou artista no prompt.
- Guardar os prompts usados junto com cada arquivo (ex.: `arte/prompts.md`), para repetir o estilo depois.

## Ferramentas

ChatGPT (imagem, edição sobre a base, fundo transparente), Midjourney (referência de estilo), Adobe Firefly, Leonardo; recorte com remove.bg ou no editor. Para 3D: geradores de imagem para modelo 3D com esqueleto (ex.: Meshy). **Confira os termos de uso comercial de cada ferramenta e plano antes de publicar.**

## Prompts-modelo

Os 3 prompts prontos (personagem base, peça em camada, cenário de salão) estão no documento `01-purpurina.md` do pacote da anamnese.
