# Como usar cada arquivo

Versão de 16/11/2026. Este guia substitui o de 15/11.

## Os arquivos para baixar

| Arquivo | O que é | Quando usar |
| --- | --- | --- |
| `Anamnese-Bolinho-x-Poki.pdf` | **A anamnese completa**, 42 páginas, com todas as pranchas | Ler tudo de uma vez, imprimir, mandar para alguém |
| `Anamnese-Bolinho-x-Poki.docx` | O mesmo, em Word, com sumário | Editar ou comentar no Word ou no Google Docs |
| `Bolinho-de-Chuva.zip` | Jogos infantis, separados por tópico | Trabalhar um jogo por vez |
| `RiseONE.zip` | App de treino: visual dos exercícios | Trabalhar o RiseONE |
| `Motor-Pixel.zip` | **O motor gráfico (vetorial + 3D)**, neutro, com a estrutura de um repositório | Criar o repositório do motor; consultar as técnicas |

Os três `.zip` são independentes. O Bolinho e o RiseONE apontam para o motor no arquivo `MOTOR-GRAFICO.md`, mas não trazem cópia dele.

## Dentro de cada .zip

**Bolinho-de-Chuva.zip**
- `Anamnese-Bolinho-x-Poki.md`: a anamnese completa em texto, para IA.
- `documentos-por-topico/`: 11 arquivos `.md`, de `00-comum-a-todos-os-jogos.md` a `10-motor-pixel.md`.
- `pdf/`: os mesmos 11 tópicos em PDF.
- `pranchas/`: painéis de comparação (verde = seu, rosa = referência, vermelho = não copiar).
- `prints-originais/`: telas capturadas, por jogo.

**RiseONE.zip**
- `documento/` (`.md`) e `pdf/`: decisão de 16/11 (cartões como estão, detalhe em 3D), proposta vetorial para o modo leve, aparelhos e dois prompts para o Claude Code.
- `pranchas/` e `referencias/`: suas imagens e as fotos da academia.

**Motor-Pixel.zip**
- `README.md`: comece por aqui.
- `docs/01` a `08`: arquitetura, funções, arte vetorial, 3D, peso, como um app usa, checklist e prompt para criar o repositório.
- `motor/`: o código (carregador e 10 módulos).
- `exemplos/`: páginas que abrem no navegador.
- `apps/bolinho-de-chuva/` e `apps/riseone/`: o que cada app usa do motor.

## Passo a passo

**Só ler e decidir:** abra o PDF da anamnese completa, ou o PDF do tópico.

**Levar um jogo para outra conta do Claude:**
1. Crie um Projeto na outra conta.
2. Envie `00-comum-a-todos-os-jogos.md`, o `.md` do jogo e as pranchas citadas no fim dele.
3. Peça o plano da primeira entrega.

**Criar o repositório do motor:**
1. No Claude Code, crie o repositório `motor-pixel`.
2. Coloque nele a pasta do `Motor-Pixel.zip`.
3. Cole o prompt de `docs/08-prompt-claude-code.md`.

**Construir algo num app:**
1. Abra o repositório do app no Claude Code.
2. Cole o prompt que está no fim do documento do jogo ou do RiseONE.
3. Diga ao Claude Code que o motor está publicado em `solverone.com.br/motor-pixel/1.0/`. Faça isso só depois de criar o repositório do motor.

## O que não fazer

- Não mande todos os pacotes de uma vez para a IA. Mande um tópico por vez, junto com o `00-comum`.
- Não coloque nada de um app específico dentro do motor. O que só um app usa fica no app.
- Não mexa no H-rraaa sem a sua aprovação.

## Estado dos testes

- Os módulos `vetor` e `zoom` rodaram no navegador. Funcionaram o realce, o zoom no músculo, o toque em "onde dói" e o neon.
- Os módulos 3D só passaram na checagem de sintaxe, porque não havia Three.js aqui para rodar. O prompt de criação do repositório pede os testes e um exemplo 3D de verdade.

## Documento online

O documento online guarda o histórico das decisões: https://claude.ai/artifact/AXeaoCtEFLkt9HYz2HTEER
