---
name: comissoes-memory
description: >-
  Exclusive persistent cross-session memory skill for the Controle de Projetos nas Comissões
  project. Activate this skill at the start of every session or prompt to load current project
  state and past decisions, and at the end of every milestone to persist progress into .agents/memory/.
---

# Comissões-Memory — Memória Persistente Exclusiva do Projeto Comissões

Esta skill é **exclusiva para a gestão de memória de longo prazo** do sistema **Controle de Projetos nas Comissões** da Câmara Municipal de Itapoá. Ela garante que o agente nunca perca contexto entre conversas, nunca precise re-explorar o sistema antigo (`camara.itapoa.digital/comissoes/`) e mantenha histórico rastreável de todas as decisões e customizações.

## Estrutura de Armazenamento (`.agents/memory/`)

1. [PROJECT_STATE.md](../../memory/PROJECT_STATE.md):
   - Resumo executivo vivo (máx. ~80 linhas): fase atual, stack escolhida, módulos/rotas prontos, status do banco e sincronização SAPL, porta/domínio na VPS e próximo passo imediato.
2. [DECISIONS.md](../../memory/DECISIONS.md):
   - Registro histórico de decisões arquiteturais e de produto (formato ADR enxuto: Data, Contexto, Decisão e Impacto), incluindo melhorias solicitadas em relação ao sistema legado.
3. [LEGACY_SYSTEM_SPEC.md](../../memory/LEGACY_SYSTEM_SPEC.md):
   - Especificação técnica reversa 100% completa do sistema original (`https://camara.itapoa.digital/comissoes/`), organizada por seções numeradas (arquitetura, esquema JSON de matérias e notas, regras de negócio das 3 abas, 4 cores de legenda, 11 filtros, ordenação de 10 colunas, extração do SAPL, modal de senha admin, exportação CSV e CSS responsivo/print).

## Protocolo Obrigatório de Memória

### 1. Ao Iniciar Qualquer Sessão ou Tarefa
1. Leia integralmente [PROJECT_STATE.md](../../memory/PROJECT_STATE.md).
2. Caso a tarefa envolva arquitetura, banco de dados, autenticação, sincronização SAPL, deploy ou mudança de regra de negócio, leia [DECISIONS.md](../../memory/DECISIONS.md).
3. Caso a tarefa envolva implementar ou validar paridade com uma funcionalidade do sistema original, consulte **apenas a seção correspondente** de [LEGACY_SYSTEM_SPEC.md](../../memory/LEGACY_SYSTEM_SPEC.md).

### 2. Ao Concluir uma Funcionalidade ou Decisão
1. Atualize [PROJECT_STATE.md](../../memory/PROJECT_STATE.md) com o progresso concluído e o próximo passo recomendado.
2. Se houve escolha técnica relevante ou mudança deliberada sobre o sistema original, adicione uma entrada datada em [DECISIONS.md](../../memory/DECISIONS.md).

### 3. Regras de Ouro da Memória
- **Zero Segredos na Memória**: Nunca grave chaves privadas, tokens de GitHub ou senhas em texto puro dentro de `.agents/memory/`.
- **Alta Densidade de Sinal**: Mantenha `PROJECT_STATE.md` conciso e factual; detalhes extensos do legado permanecem isolados em `LEGACY_SYSTEM_SPEC.md`.
