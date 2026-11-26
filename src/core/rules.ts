import { AbaLista, LinhaMateria, NotaJuridico, SlotParecer } from './types';

export const PARECERES: SlotParecer[] = [
  'exec_contabil',
  'exec_juridico',
  'leg_contabil',
  'leg_juridico',
];

export const ROTULO_PARECER: Record<SlotParecer, string> = {
  exec_contabil: 'Exec. contábil',
  exec_juridico: 'Exec. jurídico',
  leg_contabil: 'Leg. contábil',
  leg_juridico: 'Leg. jurídico',
};

export const NOME_ABA: Record<AbaLista, string> = {
  comissoes: 'Nas comissões',
  encerrados: 'Encerrados',
  retirados: 'Retirados',
};

export const SUGESTOES_PADRAO: string[] = [
  'Aguardando parecer jurídico',
  'Aguardando parecer contábil',
  'Aguardando parecer CTMRB',
  'Aguardando documento complementar',
  'Alterações necessárias',
  'Pronto para deliberação',
  'Parecer jurídico contrário',
];

export function semAcento(s: string | null | undefined): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  if (!a || !m || !d) return iso;
  return `${d}/${m}/${a}`;
}

export function dataHoraBR(s: string | null | undefined): string {
  if (!s) return '';
  const [d, h] = s.split(' ');
  return `${dataBR(d)} às ${(h || '').slice(0, 5)}`;
}

export function diasDesde(iso: string | null | undefined, hojeIso: string): number | null {
  if (!iso) return null;
  const tHoje = Date.parse(hojeIso.slice(0, 10));
  const tData = Date.parse(iso.slice(0, 10));
  if (Number.isNaN(tHoje) || Number.isNaN(tData)) return null;
  return Math.round((tHoje - tData) / 86400000);
}

export function notaDe(l: LinhaMateria): Partial<NotaJuridico> {
  return l.nota || {};
}

export function temSapl(l: LinhaMateria, c: SlotParecer): boolean {
  return (l.pareceres[c] || []).length > 0;
}

export function temParecer(l: LinhaMateria, c: SlotParecer): boolean {
  return temSapl(l, c) || Boolean(notaDe(l)[c]);
}

export function relatorDe(l: LinhaMateria): string {
  return l.relator || notaDe(l).relator || '';
}

export function autoresDe(l: LinhaMateria): string[] {
  return String(l.autores || '')
    .split(/\s*,\s*/)
    .filter(Boolean);
}

export function doExecutivo(l: LinhaMateria): boolean {
  return Boolean(l.executivo);
}

export function parecerPrevisto(l: LinhaMateria): boolean {
  const n = notaDe(l);
  return /parecer previsto/.test(semAcento([n.observacoes, n.situacao].join(' ')));
}

export function seisMeses(l: LinhaMateria, hojeIso: string): boolean {
  return (diasDesde(l.entrada, hojeIso) ?? 0) > 182;
}

export function ehCtmrb(l: LinhaMateria): boolean {
  const n = notaDe(l);
  const texto = [
    n.situacao,
    n.observacoes,
    ...(l.outros_pareceres || []).map((p) => p.nome),
  ].join(' ');
  return /ctmrb|cmrtb|ruas e bairros/i.test(texto);
}

export function aguardaJuridico(l: LinhaMateria): boolean {
  const sit = notaDe(l).situacao || '';
  if (sit) return /aguard\w* parecer jur/i.test(sit);
  return (l.ultima !== null && l.ultima.status === 83) || !temParecer(l, 'leg_juridico');
}

/**
 * Cores da aba "Nas comissões".
 * Ordem de precedência: parecer previsto (c-prev) > 6 meses (c-seis) > CTMRB (c-ctmrb) > jurídico (c-jur).
 */
export function corDaLinha(l: LinhaMateria, hojeIso: string): '' | 'c-prev' | 'c-seis' | 'c-ctmrb' | 'c-jur' {
  if (parecerPrevisto(l)) return 'c-prev';
  if (seisMeses(l, hojeIso)) return 'c-seis';
  if (ehCtmrb(l)) return 'c-ctmrb';
  if (aguardaJuridico(l)) return 'c-jur';
  return '';
}

export function hojeLocalISO(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

export function agoraLocalTimestamp(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  return parts;
}
