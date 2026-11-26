---
name: frontend-excellence
description: >-
  UI/UX design system, institutional purple theme (#4b2a6b), 4 semantic row highlight colors,
  sticky two-row table header, responsive mobile cards (<=860px), expandable detail & annotation drawer,
  and A4 landscape print layout for Controle de Projetos nas Comissões. Activate whenever building
  or refining any UI component.
---

# Frontend Excellence — Controle de Projetos nas Comissões (Câmara Municipal de Itapoá)

Antes de implementar componentes HTML/CSS/DOM complexos (`<dialog>`, tabelas sticky de múltiplos níveis, filtros reativos, impressão A4 paisagem), consulte também a skill global **`modern-web-guidance`** para aplicar APIs web modernas e acessíveis.

## 1. Identidade Visual Institucional (Tema Roxo Comissões)
- **Paleta Principal (CSS Custom Properties)**:
  - `--roxo: #4b2a6b` | `--roxo-esc: #3d2158` | `--roxo-claro: #f1ecf6`
  - `--tinta: #1c1826` | `--suave: #5d5670` | `--linha: #e4e0ea` | `--fundo: #f6f5f8` | `--papel: #ffffff`
  - Semânticas: `--ok: #1f6f46` (`--ok-fundo: #e7f4ec`) | `--aviso: #8a5a00` (`--aviso-fundo: #fff3d6`) | `--erro: #9b1c1c` (`--erro-fundo: #fdecec`)
- **Cores das 4 Categorias na Aba "Nas comissões" (Ordem de Precedência Estrita)**:
  1. **Parecer previsto (`c-prev`)**: Fundo `--c-prev: #e3f5e9`, barra lateral esquerda 4px `--c-prev-b: #1f8a4c` (Verde).
  2. **Mais de 6 meses tramitando (`c-seis`)**: Fundo `--c-seis: #fde8e8`, barra lateral esquerda 4px `--c-seis-b: #c0392b` (Vermelho).
  3. **Parecer da CTMRB (`c-ctmrb`)**: Fundo `--c-ctmrb: #e5effb`, barra lateral esquerda 4px `--c-ctmrb-b: #3b7dd8` (Azul).
  4. **Aguardando parecer jurídico (`c-jur`)**: Fundo `--c-jur: #fff4d9`, barra lateral esquerda 4px `--c-jur-b: #d99a00` (Amarelo).
- **Tipografia**: `Poppins` (400, 500, 600, 700), `14px/1.45`, com `font-variant-numeric: tabular-nums` em datas, números de pareceres e contadores de dias.

## 2. Arquitetura de Layout e Responsividade
- **Desktop (`>= 861px`)**:
  - Layout `100vh` com `body { display: flex; flex-direction: column; overflow: hidden }`.
  - Cabeçalho `.topo`, abas `.abas`, barra `.filtros` e pílulas `.legenda` permanecem fixos no topo; apenas `.tabela-wrap` rola vertical e horizontalmente (`flex: 1; min-height: 0`).
  - Cabeçalho da tabela `<thead>` com 2 linhas sticky (`top: -1px` na 1ª linha e altura dinâmica na 2ª linha para `Contábil` / `Jurídico` abaixo de `Executivo` e `Legislativo`).
  - Painel expandido `.det` com `position: sticky; left: 0; width: min(1200px, calc(100vw - 44px))` em grid de 2 colunas (`1.3fr 1fr`) para nunca sumir na rolagem horizontal.
- **Mobile & Tablet (`<= 860px`)**:
  - `<thead>` oculto; cada `tr.linha` vira um card em grid de 4 colunas com borda esquerda de `5px` na cor da categoria e rótulos automáticos via `td[data-rotulo]::before`.
  - Abaixo de `520px`, alterna textos `.longo` para `.curto` nas abas e pílulas de legenda.
- **Impressão (`@media print`)**:
  - `@page { size: A4 landscape; margin: 10mm }`, oculta botões de ação, filtros, abas e gaveta de detalhes aberta, e remove o `.clamp` de 3 linhas das ementas e observações.
