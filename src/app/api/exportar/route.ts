import { NextRequest, NextResponse } from 'next/server';
import { dataBR, hojeLocalISO, PARECERES, relatorDe } from '@/core/rules';
import { AbaLista, LinhaMateria, SlotParecer } from '@/core/types';
import { getAllLinhas } from '@/services/db';

export const dynamic = 'force-dynamic';

function csvCell(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (/[;"\n\r\s]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parecerCsv(l: LinhaMateria, slot: SlotParecer): string {
  const itens = l.pareceres[slot] || [];
  if (itens.length > 0) {
    return itens.map((p) => p.numero || 'anexado').join(' e ');
  }
  return l.nota?.[slot] || '';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listaParam = url.searchParams.get('lista') || 'comissoes';
  const aba: AbaLista =
    listaParam === 'encerrados' || listaParam === 'retirados' ? listaParam : 'comissoes';

  const linhas = getAllLinhas().filter((l) => l.lista === aba);

  const cabecalho = [
    'Data de entrada',
    'Proposição',
    'Autor',
    'Relator',
    'Ementa',
    'Executivo contábil',
    'Executivo jurídico',
    'Legislativo contábil',
    'Legislativo jurídico',
    'Situação no SAPL',
    'Situação',
    'Observações',
    'Link',
  ];

  const rows: string[] = [cabecalho.map(csvCell).join(';')];

  for (const l of linhas) {
    const pareceresCols = PARECERES.map((slot) => parecerCsv(l, slot));
    const row = [
      dataBR(l.entrada),
      l.titulo,
      l.autores,
      relatorDe(l),
      l.ementa,
      ...pareceresCols,
      l.situacao_sapl,
      l.nota?.situacao || '',
      l.nota?.observacoes || '',
      l.url,
    ];
    rows.push(row.map(csvCell).join(';'));
  }

  const csvContent = rows.join('\n') + '\n';
  const filename = `comissoes-${aba}-${hojeLocalISO()}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
