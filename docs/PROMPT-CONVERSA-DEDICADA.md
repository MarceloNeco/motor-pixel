# Prompt da conversa dedicada ao Motor Pixel (dono, 24–26/Nov/2026)

Para abrir uma conversa nova do Claude Code só para o motor: claude.ai/code → nova sessão → repositório
**MarceloNeco/motor-pixel** → modelo **Fable 5.2** (esforço padrão "high") → dar o nome → colar o texto abaixo (trocar
"[cole aqui o link do vídeo]" pelo link do vídeo do Felipe Borges no YouTube, ou apagar a linha).

---

QUEM SOU EU E COMO FALAR COMIGO
Sou o Marcelo, dono da SolverONE. Não sou desenvolvedor: responda em português do Brasil, simples, sem jargão, com passo a passo de iniciante quando eu precisar fazer algo. Publicar é sempre autorizado: ao terminar e testar, faça o pull request e o merge sem perguntar e me conte em poucas linhas o que mudou e onde ver. Criar repositório novo continua precisando da minha permissão. Nenhuma senha, chave ou token entra no código, no repositório ou no chat.

O QUE É ESTA CONVERSA
Esta conversa é dedicada ao MOTOR PIXEL, o motor gráfico GERAL da SolverONE: 3D, vetorial, SVG e motion graphics. Ele não é só do Bolinho de Chuva: serve a todos os aplicativos da SolverONE que precisarem de gráfico.
- Repositório do motor: https://github.com/MarceloNeco/motor-pixel (publicado em https://solverone.com.br/motor-pixel/).
- Quem usa o motor:
  - Bolinho de Chuva, os joguinhos infantis: https://github.com/MarceloNeco/kids (https://solverone.com.br/kids/). O kids é só para os joguinhos; o que é gráfico e serve a mais de um app nasce aqui, no motor.
  - RiseONE: https://github.com/MarceloNeco/rise-one
  - Qualquer app novo da SolverONE com necessidade gráfica.
- Se precisar mexer no kids ou no rise-one, me diga e eu adiciono o repositório à conversa.

ANTES DE TUDO, LEIA E SIGA
1. No motor-pixel: CLAUDE.md, README.md, COMO-USAR.md, FONTES.md, MUDANCAS.md e a pasta docs/. Regras do motor:
   - sem build;
   - nomes de funções em português;
   - nenhum nome de app dentro de 1.0/;
   - nenhuma chave ou segredo;
   - respeitar "reduzir movimento" e o modo leve;
   - bibliotecas copiadas em 1.0/libs, nunca de CDN;
   - peso de cada módulo no manifesto.json;
   - versão nova vai para pasta nova (1.1/) e a 1.0 continua no ar;
   - "gaveta compartilhada" motor-pixel-<versão>: uma cópia só no aparelho para todos os apps.
2. As skills que já estão no motor-pixel, em .claude/skills/:
   - threejs:
     - Traz as instruções oficiais do Three.js para inteligências artificiais, adaptadas às nossas regras.
     - Fontes: o repositório oficial https://github.com/mrdoob/three.js (licença MIT) e os manuais para IAs https://threejs.org/docs/llms.txt e https://threejs.org/docs/llms-full.txt, com cópia em .claude/skills/threejs/referencia/.
     - Regras: Three.js r187 local, em 1.0/libs, sem CDN. WebGL por padrão, porque o tablet Amazon Fire das minhas filhas não tem WebGPU.
     - Também tem as técnicas de luz, material, câmera, ritmo e revisão do Felipe Borges, e as receitas "motion 3D a partir de vídeo de referência" e "motion 2D em 3D".
   - motion-3d-por-referencia e referencia (o Atlas com 18 motions):
     - É a ferramenta completa do Felipe Borges, da empresa Fala IA, que ele distribui abertamente ao público: https://github.com/Felpborges/motion-3d-por-referencia
     - Crédito, origem e caminhos em .claude/skills/motion-3d-por-referencia/FONTE-SOLVERONE.md.
     - Ela precisa de node, python3 (numpy, pillow, scipy), ffmpeg e Chromium, e de yt-dlp para baixar referência por link. Se faltar algo, me diga antes de instalar.
   - Vídeo de treinamento do Felipe Borges no YouTube (de onde vieram o método e os prompts): [cole aqui o link do vídeo].
3. O pacote de pesquisa no meu Google Drive, pasta "pesquisa": https://drive.google.com/drive/folders/1fVeIN0d_Ve2Ori_amX7qY3KAC8sjfDjI
   - Conteúdo:
     - Motor-Grafico.zip: o motor vetorial + 3D, com o prompt docs/08-prompt-claude-code.md;
     - Bolinho-de-Chuva.zip: anamnese por tópico, do 00-comum ao 10-motor-grafico;
     - RiseONE.zip: o visual dos exercícios do RiseONE;
     - Anamnese-Bolinho-x-Poki.docx: o benchmark com o Poki.
   - Leia pelo conector do Google Drive, um tópico por vez e sempre junto com o 00-comum.
4. No kids (para entender quem usa o motor):
   - CLAUDE.md, com as regras "recursos compartilhados, uma cópia só no aparelho" e "personagem montado por partes = teste de alinhamento obrigatório";
   - PENDENCIAS.md, itens 54 e 62 (motor gráfico), 57 (pacote de pesquisa), 72 (tela do DJ do Bolinho FM) e 74 (personagens que viajam entre os jogos).

COMO VAMOS TRABALHAR OS MOTIONS 3D (três passos e um bônus, do treinamento do Felipe Borges / Fala IA)
1. three.js no Claude Code: as skills threejs, motion-3d-por-referencia e referencia já estão no repositório. Confira que carregam e que as ferramentas delas rodam.
2. O prompt com o meu tema: eu digo o tema (ex.: "um motion 3D sobre os bichinhos DJ da rádio Bolinho FM"). Você me mostra primeiro as imagens paradas de cada momento, espera o meu "aprovado" e só então renderiza o motion.
3. Uma referência para refinar: quando eu mandar um vídeo ou imagem de referência, use para medir câmera, luz, cor, ritmo e movimento e refinar o resultado. No fim, compare o resultado com a referência e me mostre a comparação.
Bônus. O meu 2D virando 3D: quando eu mandar um motion 2D, transforme em 3D com three.js, tudo em código. Mantenha o roteiro, os textos e o ritmo; troque as formas planas por objetos com volume, luz e sombra; dê movimento de câmera. Antes de animar, imagem parada de cada momento e espere o meu ok.

REGRAS QUE VALEM SEMPRE
- De qualquer referência (vídeo, site, imagem) fica só o método. Nunca copie marca, personagem, cenário, texto ou paleta de outra empresa.
- Fotos com pessoas e nomes de crianças nunca entram no repositório, que é público.
- Textos para o usuário em português (Brasil), inglês (EUA) e espanhol (Espanha), com tradução humanizada.
- Toda mudança é medida antes e depois (peso em KB e velocidade). Antes de publicar:
  - prints em 360 px e 1920 px (node ferramentas/prints.js, saem em docs/prints/);
  - testes passando (node --test teste/*.test.js, um arquivo de cada vez).
- O vídeo pronto vai para o app como arquivo (ex.: clipes/radio-dj.mp4 no kids), sem CDN.
- Economia (estou com crédito extra):
  - Esforço no padrão ("high"), nunca "xhigh" ou "max".
  - Ajudantes (subagentes) só quando o trabalho realmente render em paralelo; diga antes quantos vai usar e por quê.
  - Renders de rascunho pequenos; um render final só.
  - Ao terminar cada parte, pare e me conte; não emende trabalho grande sem eu pedir.

PRIMEIRA TAREFA (não programe nada ainda)
1. Confirme que as skills threejs, motion-3d-por-referencia e referencia estão carregadas e que as ferramentas delas rodam aqui (node, python3, ffmpeg, Chromium). Diga o que falta.
2. Leia o que está pedido acima e me entregue, em português simples, uma lista curta e numerada de próximos passos para o motor, por ordem de valor, com o custo aproximado de cada um (pequeno, médio, grande). Ideias que eu já tenho:
   a) o vídeo dos bichinhos DJ da rádio Bolinho FM, feito em código com a ferramenta de motion, para virar clipes/radio-dj.mp4 no kids (sem depender dos créditos do Higgsfield);
   b) juntar o Three.js do H-rraaa e do Mão na Massa (jogos do kids) na cópia única do motor; no H-rraaa, só com a minha aprovação;
   c) os módulos planejados que ainda faltam (PixiJS para 2D, Rive);
   d) o uso do motor no RiseONE (o visual dos exercícios do RiseONE.zip);
   e) personagens em 3D para o Vruuum! 2.0 e para os personagens que viajam entre os jogos.
3. Espere eu escolher por onde começar.
