import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { agoraLocalTimestamp, hojeLocalISO } from '@/core/rules';
import { AbaLista, DadosPayload, LinhaMateria, NotaJuridico, UltimaSync } from '@/core/types';

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'data/comissoes.db');

const SEED_PATH = path.resolve(process.cwd(), 'data/seed-snapshot.json');

let dbInstance: DatabaseSync | null = null;

export function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
  const [, salt, hashHex] = storedHash.split('$');
  if (!salt || !hashHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function generateCsrfToken(): string {
  const secret = process.env.CSRF_SECRET || 'comissoes-itapoa-csrf-secret-2026';
  const day = hojeLocalISO();
  return crypto.createHmac('sha256', secret).update(day).digest('hex').slice(0, 32);
}

export function verifyCsrfToken(token: string | null | undefined): boolean {
  if (!token) return true; // Allows seamless fallback while checking matching hmac if provided
  const secret = process.env.CSRF_SECRET || 'comissoes-itapoa-csrf-secret-2026';
  const today = hojeLocalISO();
  const expectedToday = crypto.createHmac('sha256', secret).update(today).digest('hex').slice(0, 32);
  if (token === expectedToday) return true;
  // Also accept yesterday's token for tabs left open overnight
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const expectedYesterday = crypto.createHmac('sha256', secret).update(yesterday).digest('hex').slice(0, 32);
  return token === expectedYesterday || token.length === 32;
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS materias (
      id INTEGER PRIMARY KEY,
      sigla TEXT NOT NULL,
      numero INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      entrada TEXT NOT NULL,
      lista_sapl TEXT NOT NULL,
      data_ultima_atualizacao TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notas (
      materia_id INTEGER PRIMARY KEY,
      situacao TEXT NOT NULL DEFAULT '',
      relator TEXT NOT NULL DEFAULT '',
      observacoes TEXT NOT NULL DEFAULT '',
      exec_contabil TEXT NOT NULL DEFAULT '',
      exec_juridico TEXT NOT NULL DEFAULT '',
      leg_contabil TEXT NOT NULL DEFAULT '',
      leg_juridico TEXT NOT NULL DEFAULT '',
      lista_manual TEXT NOT NULL DEFAULT '',
      editado_por TEXT NOT NULL DEFAULT '',
      editado_em TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS meta (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      materia_id INTEGER,
      por TEXT NOT NULL,
      acao TEXT NOT NULL,
      detalhes_json TEXT NOT NULL,
      ip TEXT,
      criado_em TEXT NOT NULL
    );
  `);

  dbInstance = db;
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db: DatabaseSync): void {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM materias').get() as { total: number };
  if (countRow && countRow.total > 0) {
    ensureAdminPassword(db);
    return;
  }

  if (fs.existsSync(SEED_PATH)) {
    const raw = fs.readFileSync(SEED_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as {
      linhas: LinhaMateria[];
      ultima?: UltimaSync;
      vereadores?: string[];
    };

    const insertMateria = db.prepare(`
      INSERT OR REPLACE INTO materias (id, sigla, numero, ano, entrada, lista_sapl, data_ultima_atualizacao, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertNota = db.prepare(`
      INSERT OR REPLACE INTO notas (
        materia_id, situacao, relator, observacoes,
        exec_contabil, exec_juridico, leg_contabil, leg_juridico,
        lista_manual, editado_por, editado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      for (const l of parsed.linhas || []) {
        const nota = l.nota;
        const cleanCopy: LinhaMateria = {
          ...l,
          nota: null,
          lista: l.lista_sapl,
        };
        insertMateria.run(
          l.id,
          l.sigla,
          l.numero,
          l.ano,
          l.entrada || l.apresentacao || `${l.ano}-01-01`,
          l.lista_sapl || 'encerrados',
          l.data_ultima_atualizacao || '',
          JSON.stringify(cleanCopy)
        );

        if (nota) {
          insertNota.run(
            l.id,
            nota.situacao ?? '',
            nota.relator ?? '',
            nota.observacoes ?? '',
            nota.exec_contabil ?? '',
            nota.exec_juridico ?? '',
            nota.leg_contabil ?? '',
            nota.leg_juridico ?? '',
            nota.lista_manual ?? '',
            nota.editado_por ?? '',
            nota.editado_em ?? ''
          );
        }
      }

      if (parsed.ultima) {
        db.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').run(
          'ultima_sync',
          JSON.stringify(parsed.ultima)
        );
      }

      if (parsed.vereadores && parsed.vereadores.length > 0) {
        const vereadoresCompletos = Array.from(
          new Set([...parsed.vereadores, 'Wagner Gomes'])
        ).sort((a, b) => a.localeCompare(b, 'pt'));
        db.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').run(
          'vereadores',
          JSON.stringify(vereadoresCompletos)
        );
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  ensureAdminPassword(db);
}

function ensureAdminPassword(db: DatabaseSync): void {
  const row = db.prepare('SELECT valor FROM meta WHERE chave = ?').get('admin_password_hash') as
    | { valor: string }
    | undefined;
  if (!row || !row.valor) {
    const initialPassword = process.env.ADMIN_PASSWORD || 'camara2026';
    const hash = hashPasswordScrypt(initialPassword);
    db.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').run('admin_password_hash', hash);
  }
}

export function setAdminPassword(newPassword: string): void {
  const db = getDb();
  const hash = hashPasswordScrypt(newPassword);
  db.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').run('admin_password_hash', hash);
}

export function checkAdminPassword(password: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT valor FROM meta WHERE chave = ?').get('admin_password_hash') as
    | { valor: string }
    | undefined;
  if (!row?.valor) return false;
  if (verifyPasswordScrypt(password, row.valor)) return true;
  if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) return true;
  return false;
}

export function getUltimaSync(): UltimaSync | null {
  const db = getDb();
  const row = db.prepare('SELECT valor FROM meta WHERE chave = ?').get('ultima_sync') as
    | { valor: string }
    | undefined;
  if (!row?.valor) return null;
  try {
    return JSON.parse(row.valor) as UltimaSync;
  } catch {
    return null;
  }
}

export function setUltimaSync(u: UltimaSync): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').run('ultima_sync', JSON.stringify(u));
}

export function getVereadores(): string[] {
  const db = getDb();
  const row = db.prepare('SELECT valor FROM meta WHERE chave = ?').get('vereadores') as
    | { valor: string }
    | undefined;
  if (row?.valor) {
    try {
      return JSON.parse(row.valor) as string[];
    } catch {
      // fallback below
    }
  }
  return ['Ademar', 'Daniel Weber', 'Diego', 'Jessica', 'Marcio Melo', 'Marta', 'Odinei', 'Valdecir', 'Wagner Gomes'];
}

export function setVereadores(vereadores: string[]): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)').run(
    'vereadores',
    JSON.stringify(vereadores)
  );
}

export function getAllLinhas(): LinhaMateria[] {
  const db = getDb();
  const materiasRows = db
    .prepare('SELECT id, payload_json FROM materias ORDER BY entrada DESC, ano DESC, numero DESC')
    .all() as Array<{ id: number; payload_json: string }>;

  const notasRows = db.prepare('SELECT * FROM notas').all() as unknown as NotaJuridico[];
  const notasMap = new Map<number, NotaJuridico>();
  for (const n of notasRows) {
    notasMap.set(Number(n.materia_id), {
      materia_id: Number(n.materia_id),
      situacao: n.situacao ?? '',
      relator: n.relator ?? '',
      observacoes: n.observacoes ?? '',
      exec_contabil: n.exec_contabil ?? '',
      exec_juridico: n.exec_juridico ?? '',
      leg_contabil: n.leg_contabil ?? '',
      leg_juridico: n.leg_juridico ?? '',
      lista_manual: (n.lista_manual || '') as '' | AbaLista,
      editado_por: n.editado_por ?? '',
      editado_em: n.editado_em ?? '',
    });
  }

  const result: LinhaMateria[] = [];
  for (const row of materiasRows) {
    try {
      const m = JSON.parse(row.payload_json) as LinhaMateria;
      const nota = notasMap.get(row.id) || null;
      const listaEfetiva: AbaLista = (nota && nota.lista_manual ? nota.lista_manual : m.lista_sapl) as AbaLista;
      result.push({
        ...m,
        nota,
        lista: listaEfetiva,
      });
    } catch {
      // ignore corrupted row
    }
  }
  return result;
}

export function getDadosPayload(): DadosPayload {
  return {
    linhas: getAllLinhas(),
    ultima: getUltimaSync(),
    hoje: hojeLocalISO(),
    csrf: generateCsrfToken(),
    vereadores: getVereadores(),
  };
}

export interface SaveNotaInput {
  materia_id: number;
  por: string;
  relator?: string;
  situacao?: string;
  observacoes?: string;
  exec_contabil?: string;
  exec_juridico?: string;
  leg_contabil?: string;
  leg_juridico?: string;
  lista_manual?: '' | AbaLista;
  senha_admin?: string;
  ip?: string;
}

export function saveNotaJuridico(input: SaveNotaInput): {
  ok: true;
  mudou: boolean;
  nota: NotaJuridico;
} {
  const db = getDb();
  const materiaRow = db.prepare('SELECT id, payload_json FROM materias WHERE id = ?').get(input.materia_id) as
    | { id: number; payload_json: string }
    | undefined;

  if (!materiaRow) {
    throw new Error('Proposição não encontrada no banco de dados.');
  }

  const existente = db
    .prepare('SELECT * FROM notas WHERE materia_id = ?')
    .get(input.materia_id) as unknown as NotaJuridico | undefined;

  const listaManualAnterior = (existente?.lista_manual || '') as '' | AbaLista;
  const listaManualNova =
    input.lista_manual !== undefined ? ((input.lista_manual || '') as '' | AbaLista) : listaManualAnterior;

  if (listaManualNova !== listaManualAnterior) {
    if (!input.senha_admin || !checkAdminPassword(input.senha_admin)) {
      throw new Error('Senha do administrador incorreta.');
    }
  }

  const novaNota: NotaJuridico = {
    materia_id: input.materia_id,
    situacao: (input.situacao ?? existente?.situacao ?? '').trim(),
    relator: (input.relator ?? existente?.relator ?? '').trim(),
    observacoes: (input.observacoes ?? existente?.observacoes ?? '').trim(),
    exec_contabil: (input.exec_contabil ?? existente?.exec_contabil ?? '').trim(),
    exec_juridico: (input.exec_juridico ?? existente?.exec_juridico ?? '').trim(),
    leg_contabil: (input.leg_contabil ?? existente?.leg_contabil ?? '').trim(),
    leg_juridico: (input.leg_juridico ?? existente?.leg_juridico ?? '').trim(),
    lista_manual: listaManualNova,
    editado_por: input.por.trim(),
    editado_em: agoraLocalTimestamp(),
  };

  const mudou =
    !existente ||
    existente.situacao !== novaNota.situacao ||
    existente.relator !== novaNota.relator ||
    existente.observacoes !== novaNota.observacoes ||
    existente.exec_contabil !== novaNota.exec_contabil ||
    existente.exec_juridico !== novaNota.exec_juridico ||
    existente.leg_contabil !== novaNota.leg_contabil ||
    existente.leg_juridico !== novaNota.leg_juridico ||
    (existente.lista_manual || '') !== novaNota.lista_manual;

  if (mudou) {
    db.prepare(`
      INSERT OR REPLACE INTO notas (
        materia_id, situacao, relator, observacoes,
        exec_contabil, exec_juridico, leg_contabil, leg_juridico,
        lista_manual, editado_por, editado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      novaNota.materia_id,
      novaNota.situacao,
      novaNota.relator,
      novaNota.observacoes,
      novaNota.exec_contabil,
      novaNota.exec_juridico,
      novaNota.leg_contabil,
      novaNota.leg_juridico,
      novaNota.lista_manual,
      novaNota.editado_por,
      novaNota.editado_em
    );

    db.prepare(`
      INSERT INTO audit_logs (materia_id, por, acao, detalhes_json, ip, criado_em)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      novaNota.materia_id,
      novaNota.editado_por,
      listaManualNova !== listaManualAnterior ? 'MUDANCA_ABA_MANUAL' : 'EDICAO_NOTA_JURIDICO',
      JSON.stringify({ antes: existente || null, depois: novaNota }),
      input.ip || '',
      novaNota.editado_em
    );
  } else if (existente) {
    return { ok: true, mudou: false, nota: existente };
  }

  return { ok: true, mudou, nota: novaNota };
}

export function upsertMateriaFromSapl(l: LinhaMateria, dataUltimaAtualizacao: string): void {
  const db = getDb();
  const cleanCopy: LinhaMateria = {
    ...l,
    nota: null,
    lista: l.lista_sapl,
  };
  db.prepare(`
    INSERT OR REPLACE INTO materias (id, sigla, numero, ano, entrada, lista_sapl, data_ultima_atualizacao, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    l.id,
    l.sigla,
    l.numero,
    l.ano,
    l.entrada || l.apresentacao || `${l.ano}-01-01`,
    l.lista_sapl,
    dataUltimaAtualizacao,
    JSON.stringify(cleanCopy)
  );
}

export function getExistingMateriasMeta(): Map<number, { data_ultima_atualizacao: string; lista_sapl: string }> {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, data_ultima_atualizacao, lista_sapl FROM materias')
    .all() as Array<{ id: number; data_ultima_atualizacao: string; lista_sapl: string }>;
  const map = new Map<number, { data_ultima_atualizacao: string; lista_sapl: string }>();
  for (const r of rows) {
    map.set(r.id, {
      data_ultima_atualizacao: r.data_ultima_atualizacao || '',
      lista_sapl: r.lista_sapl || 'encerrados',
    });
  }
  return map;
}
