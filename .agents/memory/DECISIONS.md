# Decisões Arquiteturais e de Produto — Controle de Projetos nas Comissões

### [2026-11-26] ADR-001: Stack Next.js 15 + TypeScript + SQLite WAL (`node:sqlite`)
- **Contexto**: O sistema original (`camara.itapoa.digital/comissoes/`) foi construído em PHP com cache local em JSON/SQLite por um servidor que não está mais na Câmara. Precisamos recriá-lo na VPS oficial da Câmara (`177.153.60.71`), alinhado aos demais sistemas modernos (`PautaOnline`, `Emendas`, `Eventos`), com alta performance, tipagem estrita e facilidade de manutenção e evolução.
- **Decisão**: Utilizar **Next.js 15 (App Router)** com **TypeScript** e banco de dados **SQLite em modo WAL (`node:sqlite`)** armazenado em `data/comissoes.db`, pré-populando instantaneamente as 537 matérias e todas as 53 anotações históricas do jurídico extraídas do sistema original, além de motor próprio de sincronização incremental e completa com a API REST do SAPL (`https://sapl.itapoa.sc.leg.br/api/`).
- **Impacto**: Paridade visual e funcional de 100% com o sistema original, mantendo compatibilidade inclusive com as URLs `salvar.php`, `atualizar.php` e `exportar.php` (via Route Handlers), tempo de carregamento instantâneo e sincronização com o SAPL muito mais rápida graças ao cache incremental por `data_ultima_atualizacao`.

### [2026-11-26] ADR-002: Segurança de Senha Admin (`scrypt`) e Auditoria (`audit_logs`)
- **Contexto**: A mudança manual de aba (`lista_manual`: mover para Encerrados, Retirados ou forçar permanência em Nas comissões) exige senha de administrador.
- **Decisão**: Armazenar a senha do administrador com hash criptográfico `scrypt` (configurável via variável `ADMIN_PASSWORD` no `.env` / script de deploy, com senha padrão administrativa inicial documentada e alterável) e gravar trilha completa em `audit_logs` para toda edição de anotação jurídica ou mudança de aba.
- **Impacto**: Conformidade com boas práticas de segurança e Controle Interno da Câmara Municipal de Itapoá.
