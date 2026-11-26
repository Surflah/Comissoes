# Estado do Projeto — Controle de Projetos nas Comissões

## Status Atual
- **Fase**: **Fases 0 a 4 Concluídas e Implantadas em Produção** — Sistema 100% operacional com paridade total em relação ao sistema legado (`camara.itapoa.digital/comissoes/`), banco SQLite WAL pré-populado com todas as 537 proposições de 2025–2026 e 53 anotações históricas do jurídico, motor de sincronização incremental/completa com a API REST do SAPL e trilha de auditoria (`audit_logs`).
- **Repositório GitHub**: `https://github.com/Surflah/Comissoes`
- **Domínio de Produção**: `https://comissoes.camaraitapoa.sc.gov.br` (VPS `177.153.60.71`, serviço `comissoes.service` na porta `3008`, Nginx proxy reverso + SSL Let's Encrypt)
- **Portal Central**: Integrado em `https://sistemas.camaraitapoa.sc.gov.br/` (`/var/www/sistemas/index.html`, card `CP • COMISSÕES`)
- **Senha de Administrador (Mudança de Aba `lista_manual`)**:
  - Senha inicial configurada com hash `scrypt`: `camara2026` (alterável a qualquer momento via `ADMIN_PASSWORD='nova_senha' ./deploy-vps.sh` ou `ADMIN_PASSWORD='nova_senha' npm run admin:senha`).

## Roteiro de Implementação
- [x] **Fase 0**: Exploração completa de `https://camara.itapoa.digital/comissoes/`, extração do HTML/CSS/JS e das 537 matérias + 53 anotações do jurídico, criação do `AGENTS.md`, 5 skills modulares (incluindo `comissoes-memory` exclusiva) e `LEGACY_SYSTEM_SPEC.md`.
- [x] **Fase 1**: Relatório Técnico Completo do sistema legado entregue em artefato estruturado.
- [x] **Fase 2**: Desenvolvimento da aplicação Next.js 15 + TypeScript + SQLite WAL (`data/comissoes.db`), seed integral dos dados atuais (537 proposições e anotações do jurídico), motor de sincronização SAPL (`/api/atualizar` / `atualizar.php`), salvamento de anotações e modal de senha admin (`/api/salvar` / `salvar.php`) e exportação CSV (`/api/exportar` / `exportar.php`).
- [x] **Fase 3**: Criação do repositório `Surflah/Comissoes` no GitHub e push do código-fonte.
- [x] **Fase 4**: Deploy na VPS (`ticamitp@177.153.60.71`), configuração do Systemd (`comissoes.service` na porta `3008`), Nginx + SSL Let's Encrypt para `comissoes.camaraitapoa.sc.gov.br` e inclusão do card no Portal Central `https://sistemas.camaraitapoa.sc.gov.br/`.

## Próximo Passo Recomendado
Pronto para uso operacional e para as melhorias e evoluções específicas que serão solicitadas nas próximas etapas.
