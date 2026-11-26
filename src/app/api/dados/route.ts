import { NextResponse } from 'next/server';
import { getDadosPayload } from '@/services/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = getDadosPayload();
  return NextResponse.json(payload);
}
