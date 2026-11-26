---
name: clean-architecture
description: >-
  Modular Next.js + TypeScript + SQLite (node:sqlite WAL) architecture, admin password verification
  (scrypt) for manual tab changes, AuditLog tracking, CSV export, and VPS deployment standards for
  Controle de Projetos nas Comissões. Activate when building backend services, APIs, database, or deploy scripts.
---

# Clean Architecture & Infraestrutura — Controle de Projetos nas Comissões

## 1. Stack Alinhada ao Ecossistema da Câmara de Itapoá
- **Fullstack**: **Next.js 15 (App Router)** + **TypeScript estrito**
- **Persistência**: **SQLite nativo (`node:sqlite` com `PRAGMA journal_mode = WAL`)** em `data/comissoes.db`, garantindo zero dependência de binários externos pesados, leitura/escrita atômica em sub-milissegundos, preservação das 537 matérias + anotações do jurídico (`notas`) e histórico de auditoria (`audit_logs`).
- **Compatibilidade Total de Endpoints**:
  - Suportar tanto rotas RESTful modernas (`/api/dados`, `/api/salvar`, `/api/atualizar`, `/api/exportar`) quanto os caminhos legados (`/salvar.php`, `/atualizar.php`, `/exportar.php` via Route Handlers ou `rewrites` no `next.config.ts`) para 100% de paridade.

## 2. Organização Modular de Pastas
```text
src/
├── core/
│   ├── types.ts          # Interfaces TypeScript (LinhaMateria, NotaJuridico, ParecerItem, HistoricoItem, UltimaSync)
│   └── rules.ts          # Regras puras (classificação de cores c-prev/c-seis/c-ctmrb/c-jur, filtros, ordenação, diasDesde)
├── services/
│   ├── db.ts             # Camada SQLite WAL (materias_cache, notas_juridico, sync_meta, config, audit_logs) + seed inicial
│   ├── auth.ts           # Hash/verificação scrypt da senha do administrador + geração/validação CSRF
│   └── sapl-sync.ts      # Sincronizador incremental e completo com a API REST do SAPL (sapl.itapoa.sc.leg.br/api)
├── app/
│   ├── page.tsx          # Interface principal Controle de Projetos nas Comissões
│   ├── layout.tsx        # Metadados, fonte Poppins e CSS institucional
│   └── api/
│       ├── dados/        # GET estado completo (linhas, ultima, hoje, vereadores)
│       ├── salvar/       # POST salvar anotação jurídica e mudança de aba com validação de senha admin
│       ├── atualizar/    # GET status / POST disparo de sincronização assíncrona com o SAPL
│       └── exportar/     # GET download CSV com separador ';' e BOM UTF-8 por aba (comissoes, encerrados, retirados)
└── components/
    └── ComissoesClient.tsx # Aplicação cliente interativa com paridade 1:1 + melhorias de UX
```

## 3. Segurança e Controle Interno
- **Proteção de Mudança de Aba (`lista_manual`)**:
  - Salvar anotações comuns (`relator`, `situacao`, `observacoes`, `exec_contabil`, `exec_juridico`, `leg_contabil`, `leg_juridico`) exige apenas identificar `por` (`Quem está editando`), gravado no `localStorage` (`comissoes_nome`).
  - Alterar `lista_manual` (`Automático pelo SAPL`, `Manter em Nas comissões`, `Mover para Encerrados`, `Retirar da lista`) abre o modal `<dialog id="modal-senha">` e valida `senha_admin` no servidor contra hash `scrypt`.
- **Trilha de Auditoria (`audit_logs`)**:
  - Toda edição de nota ou movimentação manual de aba registra `materia_id`, `por`, `acao`, `antes_json`, `depois_json`, `ip` e `criado_em`.
