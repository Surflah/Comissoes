import { NextRequest, NextResponse } from 'next/server';
import { getUltimaSync, verifyCsrfToken } from '@/services/db';
import { isSyncRunning, runSaplSync } from '@/services/sapl-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ultima: getUltimaSync(),
    rodando: isSyncRunning(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const csrfHeader = req.headers.get('x-csrf');
    if (!verifyCsrfToken(csrfHeader)) {
      return NextResponse.json({ ok: false, erro: 'Sessão expirada. Recarregue a página.' }, { status: 403 });
    }

    if (!isSyncRunning()) {
      // Dispara em background para responder imediatamente ao cliente enquanto ele faz polling GET
      void runSaplSync(false).catch((err) => {
        console.error('[SAPL Sync Error]', err);
      });
    }

    return NextResponse.json({
      ok: true,
      ultima: getUltimaSync(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao iniciar sincronização.';
    return NextResponse.json({ ok: false, erro: message }, { status: 500 });
  }
}
