# Codebase Map — Controle de Projetos nas Comissões (`Comissoes`)

Este documento serve como o atlas estrutural do repositório (protocolo Cartographer / `token-economy`), permitindo localizar rapidamente qualquer módulo sem pesquisas amplas.

## Árvore Principal
```text
/Users/flavioferreira/Projetos/Comissoes/
├── AGENTS.md                           # Regras globais do agente para o projeto Comissões
├── .agents/
│   ├── memory/
│   │   ├── PROJECT_STATE.md            # Estado vivo do projeto
│   │   ├── DECISIONS.md                # Registro ADR de decisões arquiteturais
│   │   └── LEGACY_SYSTEM_SPEC.md       # Engenharia reversa 100% completa do sistema original
│   └── skills/
│       ├── comissoes-memory/SKILL.md   # Skill exclusiva de memória persistente
│       ├── token-economy/SKILL.md      # Protocolos Headroom + Cartographer
│       ├── frontend-excellence/SKILL.md# Design system roxo institucional, 4 cores, mobile e print
│       ├── clean-architecture/SKILL.md # Arquitetura Next.js 15 + SQLite WAL + scrypt + AuditLog
│       └── sapl-comissoes-sync/SKILL.md# Regras de sincronização com a API REST do SAPL
├── data/
│   ├── seed-snapshot.json              # Snapshot inicial das 537 matérias e 53 notas do jurídico
│   └── comissoes.db                    # Banco SQLite WAL gerado automaticamente em runtime
├── deploy/
│   ├── comissoes.service               # Unidade systemd na VPS (porta 3008)
│   └── nginx-comissoes.conf            # Proxy reverso Nginx para comissoes.camaraitapoa.sc.gov.br
├── deploy-vps.sh                       # Script automatizado de deploy + SSL Let's Encrypt na VPS
├── scripts/
│   ├── set-admin-password.ts           # Utilitário CLI para definir senha do administrador (scrypt)
│   └── run-sync.ts                     # Utilitário CLI para rodar sincronização SAPL
└── src/
    ├── core/
    │   ├── types.ts                    # Interfaces TypeScript (LinhaMateria, NotaJuridico, ParecerItem...)
    │   └── rules.ts                    # Regras de negócio puras (4 cores, filtros, datas, semAcento)
    ├── services/
    │   ├── db.ts                       # Camada SQLite WAL (materias, notas, meta, audit_logs) + seed
    │   └── sapl-sync.ts                # Motor de sincronização incremental/completa com a API do SAPL
    ├── components/
    │   └── ComissoesClient.tsx         # Interface reativa completa (3 abas, 11 filtros, gaveta, modal admin)
    └── app/
        ├── layout.tsx                  # Layout raiz com fonte Poppins
        ├── globals.css                 # Folha de estilos institucional responsiva e @media print A4
        ├── page.tsx                    # Server Component que pré-carrega os dados do SQLite WAL
        └── api/
            ├── dados/route.ts          # GET /api/dados
            ├── salvar/route.ts         # POST /api/salvar (e rewrite /salvar.php)
            ├── atualizar/route.ts      # GET & POST /api/atualizar (e rewrite /atualizar.php)
            └── exportar/route.ts       # GET /api/exportar (e rewrite /exportar.php?lista=...)
```
