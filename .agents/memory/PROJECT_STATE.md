# Estado do Projeto — Controle de Projetos nas Comissões

## Status Atual
- **Fase**: **Fase 1 & 2 em Execução** — Engenharia reversa 100% concluída, skills e memória exclusiva instaladas, iniciando construção da aplicação fullstack.
- **Repositório GitHub**: `https://github.com/Surflah/Comissoes` (a ser criado e publicado)
- **Domínio de Produção**: `https://comissoes.camaraitapoa.sc.gov.br` (DNS já apontado para a VPS `177.153.60.71`, porta `3008`, serviço `comissoes.service`)
- **Portal Central**: A ser adicionado em `https://sistemas.camaraitapoa.sc.gov.br/` (`/var/www/sistemas/index.html`)

## Roteiro de Implementação
- [x] **Fase 0**: Exploração completa de `https://camara.itapoa.digital/comissoes/`, extração do HTML/CSS/JS e das 537 matérias + 53 anotações do jurídico, criação do `AGENTS.md`, 5 skills modulares (incluindo `comissoes-memory` exclusiva) e `LEGACY_SYSTEM_SPEC.md`.
- [x] **Fase 1**: Relatório Técnico Completo do sistema legado entregue em artefato estruturado.
- [ ] **Fase 2**: Desenvolvimento da aplicação Next.js 15 + TypeScript + SQLite WAL (`data/comissoes.db`), seed integral dos dados atuais (537 proposições e anotações do jurídico), motor de sincronização SAPL (`/api/atualizar` / `atualizar.php`), salvamento de anotações e modal de senha admin (`/api/salvar` / `salvar.php`) e exportação CSV (`/api/exportar` / `exportar.php`).
- [ ] **Fase 3**: Criação do repositório `Surflah/Comissoes` no GitHub e push do código-fonte.
- [ ] **Fase 4**: Deploy na VPS (`ticamitp@177.153.60.71`), configuração do Systemd (`comissoes.service` na porta `3008`), Nginx + SSL Let's Encrypt para `comissoes.camaraitapoa.sc.gov.br` e inclusão do card no Portal Central `https://sistemas.camaraitapoa.sc.gov.br/`.

## Próximo Passo Recomendado
Concluir o relatório técnico e desenvolver a aplicação completa em `/Users/flavioferreira/Projetos/Comissoes`.
