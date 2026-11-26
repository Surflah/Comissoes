import { NextRequest, NextResponse } from 'next/server';
import { AbaLista } from '@/core/types';
import { saveNotaJuridico, verifyCsrfToken } from '@/services/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const csrfHeader = req.headers.get('x-csrf');
    if (!verifyCsrfToken(csrfHeader)) {
      return NextResponse.json({ ok: false, erro: 'Sessão expirada. Recarregue a página.' }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const materia_id = Number(body.materia_id);
    const por = String(body.por ?? '').trim();

    if (!materia_id || Number.isNaN(materia_id)) {
      return NextResponse.json({ ok: false, erro: 'ID da proposição inválido.' }, { status: 400 });
    }
    if (!por) {
      return NextResponse.json({ ok: false, erro: 'Informe seu nome.' }, { status: 400 });
    }

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    const listaManualParam =
      body.lista_manual !== undefined ? (String(body.lista_manual) as '' | AbaLista) : undefined;

    const res = saveNotaJuridico({
      materia_id,
      por,
      relator: body.relator !== undefined ? String(body.relator) : undefined,
      situacao: body.situacao !== undefined ? String(body.situacao) : undefined,
      observacoes: body.observacoes !== undefined ? String(body.observacoes) : undefined,
      exec_contabil: body.exec_contabil !== undefined ? String(body.exec_contabil) : undefined,
      exec_juridico: body.exec_juridico !== undefined ? String(body.exec_juridico) : undefined,
      leg_contabil: body.leg_contabil !== undefined ? String(body.leg_contabil) : undefined,
      leg_juridico: body.leg_juridico !== undefined ? String(body.leg_juridico) : undefined,
      lista_manual: listaManualParam,
      senha_admin: body.senha_admin !== undefined ? String(body.senha_admin) : undefined,
      ip,
    });

    return NextResponse.json(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Não foi possível salvar.';
    const status = message.includes('Senha') ? 403 : 400;
    return NextResponse.json({ ok: false, erro: message }, { status });
  }
}
