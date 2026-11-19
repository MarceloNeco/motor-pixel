# 10 — Offline e orçamento de peso

## Orçamento

| Item | Meta |
| --- | --- |
| Para começar a jogar | Até 5 MB (o Poki orienta 5 MB no primeiro download e 8 MB no total) |
| Cada sala ou mundo extra | Baixa em segundo plano quando escolhido; mostra progresso |
| Instalação completa de um jogo grande (Purpurina, Vruuum!) | 30 a 60 MB aceitável, baixando por partes |
| Imagens | WebP/AVIF qualidade 80; texturas 3D de 1024 px na maioria |
| Modelos 3D | .glb comprimidos; um modelo por tipo, repetido com InstancedMesh |

## Service worker por módulo

- Cada módulo do motor e cada sala têm sua própria "caixa" no cache, com versão no nome (`motor-cena3d-1.0.0`).
- A troca de versão só acontece quando **todos** os arquivos da nova versão chegaram (regra atual do Bolinho).
- Caixas antigas são apagadas depois que a nova entra.

## Modo leve automático

Aparelho com pouca memória ou processador (ou pedido do usuário): imagens na metade, sem sombra, sem filtros, menos objetos e partículas. O jogo continua funcionando.

Modelo: `../../exemplos/sw-de-um-app.js`; módulo `offline`.
