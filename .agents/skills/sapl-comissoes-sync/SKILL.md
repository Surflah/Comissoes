---
name: sapl-comissoes-sync
description: >-
  SAPL REST API synchronization engine for Controle de Projetos nas Comissões: fetching 2025-2026
  propositions, classifying parecers into the 4 slots (Executivo/Legislativo Contábil/Jurídico) +
  outros_pareceres, extracting opinion numbers from titles/filenames, determining entrada date,
  relator, situacao_sapl, resultado, and lista_sapl. Activate whenever working on SAPL integration.
---

# SAPL Comissões Sync — Motor de Integração com `sapl.itapoa.sc.leg.br`

## 1. Escopo das Matérias Monitoradas (Biênio das Comissões Permanentes 2025–2026)
- **Anos**: `2025` e `2026` (configurável para biênios futuros).
- **Tipos de Matéria (`tipomaterialegislativa`)**:
  - `1`: `PLO` (Projeto de Lei Ordinária)
  - `2`: `PRE` (Projeto de Resolução)
  - `5`: `PLC` (Projeto de Lei Complementar)
  - `6`: `PDL` (Projeto de Decreto Legislativo)
  - `11`: `PELO` (Proposta de Emenda à Lei Orgânica)
  - `12`: `VET` (Veto Parcial ou Total)
  - `17`: `PLS` (Projeto de Lei Substitutivo)
  - `20`: `EME` (Emenda Legislativa)
  - `25`: `SUB` (Subemenda Legislativa)
  - `29`: `MMPE` (Mensagem Modificativa do Poder Executivo)
  *(Ignora Indicações `IND`, Requerimentos `REQ`, Moções `MOC`, Ofícios `OFI`, Atas e Pautas, que não tramitam para parecer das Comissões Permanentes).*
- **Filtro de Elegibilidade**: Entram no painel as matérias desses tipos que passaram pelas Comissões Permanentes / Plenário ou possuem tramitação/relatoria relevante.

## 2. Endpoints da API REST do SAPL (`https://sapl.itapoa.sc.leg.br/api/`)
1. **Tabelas de Referência (cacheadas em memória na sync)**:
   - `/api/materia/tipomaterialegislativa/?page_size=100`
   - `/api/materia/regimetramitacao/?page_size=100`
   - `/api/materia/statustramitacao/?page_size=100`
   - `/api/materia/unidadetramitacao/?page_size=100`
   - `/api/base/autor/?page_size=200`
   - `/api/parlamentares/parlamentar/?page_size=100`
   - `/api/comissoes/composicao/?page_size=100` + `/api/comissoes/participacao/?composicao=32&page_size=100` (extrai os `vereadores` titulares ativos da `CP - Comissões Permanentes`).
2. **Matérias e Detalhes**:
   - Listagem paginada por ano e tipo: `/api/materia/materialegislativa/?ano=2026&tipo=<id>&page_size=100`
   - Sincronização incremental: compara `data_ultima_atualizacao` da matéria ou verifica matérias em `comissoes` para atualizar apenas aquelas modificadas (caindo de ~90s para poucos segundos nas atualizações subsequentes!).
   - Por matéria atualizada:
     - `/api/materia/tramitacao/?materia=<id>&page_size=100`
     - `/api/materia/documentoacessorio/?materia=<id>&page_size=100`
     - `/api/materia/relatoria/?materia=<id>&page_size=100`
     - `/api/materia/autoria/?materia=<id>&page_size=100` (caso `materia.autores` venha vazio ou precise confirmar coautores).

## 3. Regras de Transformação e Classificação

### A. Data de Entrada (`entrada`)
- Se houver no histórico de tramitações o passo de distribuição às comissões (`status == 12`, `"Proposição distribuída a todas as comissões"`), `entrada` é a `data_tramitacao` da primeira distribuição às comissões.
- Caso contrário, se houver `status == 52` (`"Proposição inclusa no expediente para entrada na Casa"`), usa sua data; senão usa `data_apresentacao`.

### B. Classificação de Pareceres (`documentoacessorio`)
- Para cada documento acessório cujo `nome` contenha `parecer` (case-insensitive):
  - **Extração do Número (`numero`)**:
    - Tenta extrair número e ano do `nome` ou do nome do arquivo PDF na URL (`arquivo`), convertendo anos de 2 dígitos (`.26`, `_26`) para 4 dígitos (`/2026`, `/2025`), ex.: `parecer_742_2026_plo_80.pdf` → `742/2026`; `1-_parecer_1434.26_-_plo_76.26_assinado.pdf` → `1434/2026`; `parecer_003_2025...` → `3/2025` (sem zeros à esquerda).
  - **Classificação nos 4 Slots ou `outros_pareceres`**:
    - `exec_contabil`: nome contém `contabil` (ou `contábil`) e `executivo`.
    - `exec_juridico`: nome contém `juridico` (ou `jurídico`) e `executivo`.
    - `leg_contabil`: nome contém `contabil` e (`legislativo` ou não menciona executivo nem comissão/cof/conselho).
    - `leg_juridico`: nome contém `juridico` e (`legislativo` ou não menciona executivo).
    - `outros_pareceres`: demais pareceres (`Parecer das Comissões`, `Parecer COF`, `Parecer Conselho`, `Parecer Comissão Ruas`, `Parecer COMTUR`, etc.).
- Sempre normalizar URLs `http://sapl.itapoa.sc.leg.br/...` para `https://sapl.itapoa.sc.leg.br/...`.

### C. Classificação de Aba Automática (`lista_sapl`), `situacao_sapl` e `resultado`
- **Aba Automática (`lista_sapl`)**:
  - Uma matéria está em `'comissoes'` quando ainda está em tramitação nas comissões (ex.: último status em `{12, 49, 52, 54, 59, 60, 82, 83, 84}` e ainda não teve desfecho de plenário/arquivo nem parecer final encaminhado ao Setor Legislativo/Plenário sem retorno às comissões).
  - Caso contrário, `lista_sapl = 'encerrados'`.
  - A aba efetiva exibida é `lista = nota?.lista_manual || lista_sapl`.
- **Tradução Amigável de `situacao_sapl` (quando `lista_sapl === 'comissoes'`)**:
  - `status === 60`: `'Sobrestada'`
  - `status === 59`: `'Sobrestada a pedido do autor'`
  - `status === 83`: `'No jurídico, aguardando parecer'`
  - `status === 54`: `'Voltou às comissões'`
  - `status === 49`: `'Retirada da pauta'`
  - `status in {12, 52, 82}`:
    - Se não possui `relator` no SAPL: `'Aguardando relatoria'`
    - Se possui `relator` e já tem `pareceres.leg_juridico.length > 0`: `'Parecer jurídico emitido'`
    - Se possui `relator` e não tem `leg_juridico`: `'Aguardando parecer jurídico'`
  - Quando `lista_sapl === 'encerrados'`, `situacao_sapl` é a descrição oficial do último status de tramitação.
- **Resumo de `resultado`**:
  - Combina os marcos principais do histórico com datas em formato `DD/MM/AAAA` separados por ` · `:
    - Parecer das comissões: `status in {6, 32, 85}` → `Parecer favorável DD/MM/AAAA`; `status in {51, 56, 78}` → `Parecer contrário DD/MM/AAAA`.
    - Deliberação / Desfecho final:
      - `status in {9, 65, 76, 77}` (ou aprovado em definitivo): `Aprovado DD/MM/AAAA` (usando a data da votação em plenário `status 9` ou `65`, ou sanção/promulgação se única).
      - `status === 33` (quando ainda não houve 2º turno): `Aprovado em 1º turno DD/MM/AAAA`.
      - `status === 10`: `Rejeitado DD/MM/AAAA`.
      - `status === 4`: `Retirado pelo autor DD/MM/AAAA`.
      - `status === 79`: `Substituído DD/MM/AAAA`.
- **Histórico (`historico`)**:
  - Em ordem cronológica crescente (`data`, `status`, `descricao`, `destino`, `texto`). Para matérias em `encerrados`, mantém os últimos 4 passos no payload principal para manter o JSON leve e rápido.
