# Comissões — Diretrizes do Agente (Câmara Municipal de Itapoá)

Este arquivo define as regras permanentes do projeto **Controle de Projetos nas Comissões (`Comissoes`)** para garantir máxima organização arquitetural, excelência visual (UI/UX), sincronização fiel com a API do SAPL e economia rigorosa de tokens em todos os prompts.

## 1. Memória Exclusiva e Economia de Tokens
- **Consulta Obrigatória ao Iniciar**: Antes de planejar ou editar qualquer código, ative a skill `comissoes-memory` e leia [`.agents/memory/PROJECT_STATE.md`](.agents/memory/PROJECT_STATE.md) para carregar o estado atual, stack definida, credenciais de infraestrutura e próximos passos.
- **Especificação Completa do Sistema Legado**: Jamais refaça exploração no navegador de `camara.itapoa.digital/comissoes/` sem necessidade explícita. Todo o funcionamento, esquema de dados JSON, regras de cores/filtros, extração de pareceres, endpoints SAPL e layout responsivo/impressão já estão documentados em [`.agents/memory/LEGACY_SYSTEM_SPEC.md`](.agents/memory/LEGACY_SYSTEM_SPEC.md). Leia apenas as seções necessárias com `StartLine`/`EndLine`.
- **Decisões Arquiteturais**: Consulte e atualize [`.agents/memory/DECISIONS.md`](.agents/memory/DECISIONS.md) sempre que tomar decisões de stack, banco de dados, autenticação, integrações SAPL ou deploy.

## 2. Uso de Skills Modulares (Progressive Disclosure)
Ative sob demanda as skills do projeto em `.agents/skills/` (além das skills globais do Antigravity, como `modern-web-guidance` para padrões modernos de HTML/CSS/DOM):
- `comissoes-memory`: **Exclusiva para gestão da memória persistente** (`.agents/memory/PROJECT_STATE.md`, `DECISIONS.md` e `LEGACY_SYSTEM_SPEC.md`). Usar no início e no fechamento de cada entrega.
- `token-economy`: Protocolos Headroom de compressão de contexto, leitura cirúrgica por linhas, contenção de saída de terminal e manutenção do `docs/CODEBASE_MAP.md`.
- `frontend-excellence`: Diretrizes visuais para o painel de Controle de Projetos nas Comissões (tema roxo institucional `#4b2a6b`, 3 abas, 4 pílulas de legenda com cores semânticas, tabela sticky de 2 níveis, cards mobile `<= 860px`, painel de detalhes/edição expansível e folha de impressão A4 paisagem).
- `clean-architecture`: Estruturação modular em Next.js + TypeScript + SQLite (WAL) / Prisma, proteção CSRF, autenticação de administrador com hash `scrypt` para mudança de aba (`lista_manual`), trilha de auditoria (`AuditLog`) e deploy automatizado em Linux/Nginx + SSL Let's Encrypt.
- `sapl-comissoes-sync`: Motor de sincronização incremental e completa com a API REST do SAPL (`sapl.itapoa.sc.leg.br/api/`), classificação automática de matérias (`comissoes` vs `encerrados`), extração inteligente de números de pareceres dos nomes/arquivos PDF (4 slots: Executivo Contábil/Jurídico e Legislativo Contábil/Jurídico + outros pareceres) e cálculo de prazos/resultados.

## 3. Padrões de Engenharia, Segurança e Controle Interno
- **Modularidade Estrita**: Separar regras de domínio (`src/core/`), sincronizador SAPL e banco (`src/services/`), rotas de API (`src/app/api/`) e componentes visuais (`src/components/`).
- **Segurança de Credenciais**: Hashes de senha de administrador (`scrypt`) e segredos ficam estritamente no servidor (`.env` / banco SQLite), nunca expostos no cliente.
- **Auditoria Completa**: Registrar em `AuditLog` toda anotação jurídica salva, mudança manual de aba (`comissoes` / `encerrados` / `retirados`) e sincronização com o SAPL.
- **Pronto para VPS**: Configuração padronizada para a VPS da Câmara (`177.153.60.71`, porta `3008`, serviço systemd `comissoes.service`, Nginx `comissoes.camaraitapoa.sc.gov.br` e card no portal `sistemas.camaraitapoa.sc.gov.br`).
