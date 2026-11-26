# Especificação Técnica Completa do Sistema Legado — Controle de Projetos nas Comissões
**URL Original:** `https://camara.itapoa.digital/comissoes/`
**Título da Página:** `Controle de Projetos nas Comissões · Câmara de Itapoá`
**Subtítulo:** `Câmara Municipal de Itapoá · Comissões Permanentes 2025-2026`

## Índice de Seções (Para Leitura Cirúrgica)
1. **Linhas 15–55**: Visão Geral, Arquitetura e Fluxo de Pré-Carregamento
2. **Linhas 56–130**: Esquema de Dados Completo (`#dados`, `LinhaMateria`, `NotaJuridico`, `Pareceres`)
3. **Linhas 131–215**: Regras de Negócio: 3 Abas, 4 Cores de Destaque, 11 Filtros e Ordenação de 10 Colunas
4. **Linhas 216–285**: Painel de Detalhes Expansível, Formulário de Anotações do Jurídico e Modal de Senha Admin
5. **Linhas 286–360**: Motor de Sincronização com a API do SAPL (`atualizar.php`) e Exportação CSV (`exportar.php`)
6. **Linhas 361–420**: Design System, Responsividade Mobile (`<= 860px`) e Folha de Impressão A4 Paisagem

---

## 1. Visão Geral, Arquitetura e Fluxo de Pré-Carregamento
O sistema **Controle de Projetos nas Comissões** é o painel operacional utilizado pela Assessoria Jurídica, Setor Legislativo e Comissões Permanentes da Câmara Municipal de Itapoá para acompanhar o andamento de todas as proposições legislativas do biênio (`2025–2026`), seus relatores, pareceres técnicos (Contábil e Jurídico do Executivo e do Legislativo), prazos de tramitação e observações internas de reunião.

### Arquitetura do Sistema Original
- **Renderização Híbrida (Zero Latência na Navegação)**:
  - Ao acessar `GET /comissoes/`, o servidor entrega o HTML contendo o CSS institucional inline (`12.108` bytes), a estrutura de topo/abas/filtros/tabela/modais e um bloco `<script type="application/json" id="dados">` com todas as **537 proposições** de 2025 e 2026 já mescladas com as anotações manuais do jurídico (`nota`).
  - Toda navegação entre as 3 abas (`Nas comissões`, `Encerrados`, `Retirados`), busca textual instantânea, 11 filtros especiais, filtros por Relator/Autor/Situação, ordenação nas 10 colunas e expansão da gaveta de detalhes de qualquer projeto acontecem **100% no cliente em tempo real**, sem requisições adicionais de rede.
- **Endpoints de Backend**:
  1. `GET /` (ou `/api/dados`): Entrega o payload completo `{ linhas, ultima, hoje, csrf, vereadores }`.
  2. `POST /salvar.php` (ou `/api/salvar`): Recebe JSON com `materia_id`, `por`, `relator`, `situacao`, `observacoes`, `exec_contabil`, `exec_juridico`, `leg_contabil`, `leg_juridico` e opcionalmente `lista_manual` + `senha_admin` (quando `lista_manual` foi alterado). Retorna `{ ok: true, mudou: boolean, nota: NotaJuridico }`.
  3. `POST /atualizar.php` e `GET /atualizar.php` (ou `/api/atualizar`): Dispara e monitora a sincronização com a API REST do SAPL (`https://sapl.itapoa.sc.leg.br/api/`), retornando `{ ok: true, ultima: { em, materias, atualizadas, erros, segundos } }`.
  4. `GET /exportar.php?lista=comissoes|encerrados|retirados` (ou `/api/exportar`): Gera arquivo CSV separado por `;` com 13 colunas para Excel/LibreOffice.

---

## 2. Esquema de Dados Completo (`#dados`)

### Objeto Raiz (`DadosPayload`)
```json
{
  "linhas": [ /* Array de LinhaMateria (537 itens em 2025-2026) */ ],
  "ultima": {
    "em": "2026-11-26 10:31:34",
    "materias": 1737,
    "atualizadas": 19,
    "erros": 0,
    "segundos": 85.3
  },
  "hoje": "2026-11-26",
  "csrf": "108e11350e4b36ec2f468d213d27ee96",
  "vereadores": [
    "Ademar",
    "Daniel Weber",
    "Diego",
    "Jessica",
    "Marcio Melo",
    "Marta",
    "Odinei",
    "Valdecir"
  ]
}
```
*(Nota: No HTML, `<datalist id="vereadores">` e os filtros também contemplam `"Wagner Gomes"`, suplente em exercício na CP em 2026).*

### Objeto de Proposição (`LinhaMateria`)
```json
{
  "id": 15943,
  "sigla": "PLO",
  "numero": 80,
  "ano": 2026,
  "titulo": "PLO 80/2026",
  "ementa": "Altera os anexos da Lei Municipal nº 1.495, de 29 de dezembro de 2025...",
  "autores": "Jeferson Rubens Garcia - Prefeito",
  "executivo": true,
  "relator": "Daniel Weber",
  "entrada": "2026-11-23",
  "apresentacao": "2026-11-19",
  "regime": "Urgência - Executivo (art. 51 LOM)",
  "url": "https://sapl.itapoa.sc.leg.br/materia/15943",
  "pdf": "https://sapl.itapoa.sc.leg.br/media/sapl/public/materialegislativa/2026/15943/plo_80_2026_-_subemenda_ass_jfc.pdf",
  "pareceres": {
    "exec_contabil": [
      {
        "nome": "Parecer Contábil Executivo",
        "numero": "742/2026",
        "data": "2026-11-19",
        "url": "https://sapl.itapoa.sc.leg.br/media/sapl/public/documentoacessorio/2026/11746/parecer_742_2026_plo_80.pdf",
        "autor": "Douglas de Oliveira e Flávio Elias Gelamo Custódio"
      }
    ],
    "exec_juridico": [
      {
        "nome": "Parecer Jurídico do Executivo",
        "numero": "527/2026",
        "data": "2026-11-19",
        "url": "https://sapl.itapoa.sc.leg.br/media/sapl/public/documentoacessorio/2026/11745/parecer_527.2026_-_congres__38998_-_plo_80.2026_-_subemendas_-_suplem.pdf",
        "autor": "Diego Araujo Vargas Leal"
      }
    ],
    "leg_contabil": [],
    "leg_juridico": []
  },
  "outros_pareceres": [],
  "ultima": {
    "data": "2026-11-24",
    "status": 60,
    "descricao": "Proposição sobrestada",
    "destino": "CP - COMISSÕES PERMANENTES (REUNIÃO CONJUNTA)",
    "texto": ""
  },
  "situacao_sapl": "Sobrestada",
  "resultado": "",
  "historico": [
    {
      "data": "2026-11-19",
      "status": 52,
      "descricao": "Proposição inclusa no expediente para entrada na Casa",
      "destino": "Plenário - PLEN",
      "texto": ""
    }
  ],
  "lista": "comissoes",
  "lista_sapl": "comissoes",
  "nota": {
    "materia_id": 15943,
    "situacao": "",
    "relator": "",
    "observacoes": "",
    "exec_contabil": "",
    "exec_juridico": "",
    "leg_contabil": "",
    "leg_juridico": "",
    "lista_manual": "",
    "editado_por": "Daniel",
    "editado_em": "2026-10-26 19:19:40"
  }
}
```

---

## 3. Regras de Negócio: 3 Abas, 4 Cores de Destaque, 11 Filtros e Ordenação

### 3.1. As 3 Abas (`.abas`)
1. **`Nas comissões` (`data-aba="comissoes"`)**:
   - Projetos atualmente em tramitação nas comissões (`lista === 'comissoes'`).
   - Exibe a barra de pílulas coloridas (`#legenda`) com contadores ao vivo.
   - Penúltima coluna intitula-se **`Situação`**: mostra `nota.situacao` (se houver, em negrito `.sit-manual`) acima de `situacao_sapl · DD/MM/AAAA · há X dias` (se `dias > 30`, aplica `.dias.alerta` em amarelo-escuro `#8a5a00`).
2. **`Encerrados` (`data-aba="encerrados"`)**:
   - Projetos cuja fase de comissões já encerrou ou já foram votados/sancionados/arquivados (`lista === 'encerrados'`).
   - Oculta `#legenda`.
   - Penúltima coluna muda para **`Resultado`**: mostra `l.resultado` (ex.: `Parecer favorável 17/11/2026 · Aprovado em 1º turno 23/11/2026`) e `nota.situacao` abaixo se existir.
3. **`Retirados` (`data-aba="retirados"`)**:
   - Projetos removidos manualmente da lista ativa via `nota.lista_manual = 'retirados'` (`lista === 'retirados'`).
   - Oculta `#legenda` e usa a coluna **`Resultado`**.

### 3.2. As 4 Cores Semânticas na Aba "Nas comissões" (Ordem de Precedência)
Se um projeto se enquadrar em mais de uma condição, **vale a primeira da lista abaixo**:
1. **Verde — `Parecer previsto` (`c-prev`)**:
   - Regra: `/parecer previsto/.test(semAcento([nota.observacoes, nota.situacao].join(' ')))`
2. **Vermelho — `Mais de 6 meses tramitando` (`c-seis`)**:
   - Regra: `(diasDesde(l.entrada) ?? 0) > 182`
3. **Azul — `Parecer da CTMRB` (`c-ctmrb`)**:
   - Regra: `/ctmrb|cmrtb|ruas e bairros/i.test([nota.situacao, nota.observacoes, ...(l.outros_pareceres || []).map(p => p.nome)].join(' '))`
4. **Amarelo — `Aguardando parecer jurídico` (`c-jur`)**:
   - Regra: Se `nota.situacao` estiver preenchida, testa `/aguard\w* parecer jur/i.test(nota.situacao)`. Caso contrário, retorna `true` se `l.ultima?.status === 83` OU se não houver parecer em `leg_juridico` (nem no SAPL nem anotado à mão em `nota.leg_juridico`).

### 3.3. Os 11 Filtros do Seletor `#filtro` ("Mostrar") e Busca `#busca`
- **Busca `#busca`**: Normaliza sem acentos (`NFD`) e busca em `[titulo, ementa, autores, relatorDe(l), nota.situacao, nota.observacoes]`, além de aceitar `"PLO 80"` ou `"PLO80"` sem espaço.
- **Select `#filtro`**:
  1. `""`: Todos
  2. `sem_relator`: `!relatorDe(l)` (sem relator no SAPL e sem relator manual na nota)
  3. `c-jur`: `aguardaJuridico(l)`
  4. `c-ctmrb`: `ehCtmrb(l)`
  5. `c-seis`: `seisMeses(l)`
  6. `c-prev`: `parecerPrevisto(l)`
  7. `sem_executivo`: `doExecutivo(l) && (!temParecer(l, 'exec_contabil') || !temParecer(l, 'exec_juridico'))`
  8. `parados`: `(diasDesde(l.ultima?.data) ?? 0) > 30`
  9. `urgencia`: `/urg/i.test(l.regime)`
  10. `com_obs`: `!!(nota.observacoes || '').trim()`
  11. `manual`: `PARECERES.some(c => !temSapl(l, c) && nota[c])`
- **Selects Dinâmicos por Aba (`#relator`, `#autor`, `#situacao`)**:
  - Suas opções são reconstruídas dinamicamente a partir dos projetos existentes na aba ativa (`st.aba`), ordenadas alfabeticamente em português (`localeCompare(b, 'pt')`).

### 3.4. Ordenação nas 10 Colunas (`th[data-ordem]`)
- Colunas ordenáveis: `entrada` (padrão decrescente `dir = -1`), `proposicao`, `relator`, `ementa`, `exec_contabil`, `exec_juridico`, `leg_contabil`, `leg_juridico`, `situacao` (ou `resultado`), `observacoes`.
- Regra especial de ordenação das 4 colunas de Pareceres:
  1. Pareceres publicados no SAPL **com número** (`0|ANO|NUMERO_PAD5`);
  2. Pareceres publicados no SAPL **sem número** (`1`, exibidos como `"anexado"`);
  3. Pareceres **anotados à mão** (`2|texto`);
  4. **Vazios** (`3`, exibidos como `·`).

---

## 4. Painel de Detalhes Expansível, Edição do Jurídico e Modal de Senha
Ao clicar em qualquer linha `tr.linha` (exceto em links `<a>`), abre-se logo abaixo a linha `<tr class="detalhe"><td colspan="10"><div class="det">`:
- **Coluna Esquerda (Dados do SAPL)**:
  - `Ementa` completa sem truncamento;
  - Links para `Ficha no SAPL` (`l.url`) e `Texto do projeto (PDF)` (`l.pdf`);
  - Resumo `Autor: ... · Relator: ... (ainda não lançado no SAPL, se manual) · Regime: ...`;
  - Lista `Pareceres publicados no SAPL` (os 4 slots + `outros_pareceres`, com nome, `nº X/AAAA`, data e autor);
  - Linha do tempo vertical `Tramitação` (`<ol class="tram">` em ordem cronológica reversa — mais recente no topo com bolinha roxa).
- **Coluna Direita (`<form class="editar">`)**:
  - `Quem está editando` (`name="por"`, obrigatório, salvo em `localStorage['comissoes_nome']`);
  - `Relator designado na reunião` (`name="relator"`, com `<datalist id="vereadores">`);
  - `Situação` (`name="situacao"`, com `<datalist id="sugestoes">` combinando as 7 sugestões padrão + todas as situações manuais já usadas no banco);
  - `Observações` (`name="observacoes"`, `<textarea rows="4">`);
  - Fieldset `Parecer já feito e ainda não publicado no SAPL` com grid `.quatro` (`exec_contabil`, `exec_juridico`, `leg_contabil`, `leg_juridico`);
  - Select `Em qual aba aparece` (`name="lista_manual"`):
    - `""`: `Automático pelo SAPL (hoje: Nas comissões / Encerrados)`
    - `"comissoes"`: `Manter em Nas comissões`
    - `"encerrados"`: `Mover para Encerrados`
    - `"retirados"`: `Retirar da lista`
  - **Fluxo de Senha do Administrador**:
    - Se `lista_manual` foi alterado em relação ao valor salvo anteriormente, abre `<dialog id="modal-senha">` informando `"<TITULO> vai para: <DESTINO>."` e solicitando a senha do administrador antes de enviar o `POST`.

---

## 5. Sincronização com o SAPL e Exportação CSV
- **Indicador `#sync` no Topo**:
  - Mostra `"Dados do SAPL de DD/MM/AAAA às HH:MM"`. Se a última sincronização tiver mais de 2 horas (`horas > 2`) ou `erros > 0`, recebe a classe `.sync.atrasada` (cor âmbar).
- **Planilha CSV (`exportar.php?lista=<aba>`)**:
  - Gera CSV separado por ponto-e-vírgula (`;`) com as 13 colunas:
    `"Data de entrada";Proposição;Autor;Relator;Ementa;"Executivo contábil";"Executivo jurídico";"Legislativo contábil";"Legislativo jurídico";"Situação no SAPL";Situação;Observações;Link`
  - Nome do arquivo sugerido: `comissoes-<aba>-AAAA-MM-DD.csv`.
