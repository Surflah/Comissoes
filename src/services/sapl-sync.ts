import { agoraLocalTimestamp, dataBR, semAcento } from '@/core/rules';
import {
  HistoricoStep,
  LinhaMateria,
  PareceresGroup,
  ParecerItem,
  UltimaSync,
} from '@/core/types';
import {
  getDb,
  getExistingMateriasMeta,
  getUltimaSync,
  setUltimaSync,
  setVereadores,
  upsertMateriaFromSapl,
} from './db';

const SAPL_BASE = (process.env.SAPL_BASE_URL || 'https://sapl.itapoa.sc.leg.br').replace(/\/+$/, '');

// Tipos monitorados nas Comissões Permanentes: PLO(1), PRE(2), PLC(5), PDL(6), PELO(11), VET(12), PLS(17), EME(20), SUB(25), MMPE(29)
const TIPOS_MONITORADOS = new Set<number>([1, 2, 5, 6, 11, 12, 17, 20, 25, 29]);
const ANOS_MONITORADOS = [2026, 2025];

const STATUS_EM_COMISSOES = new Set<number>([12, 49, 52, 54, 59, 60, 82, 83, 84]);

let syncInProgress = false;

export function isSyncRunning(): boolean {
  return syncInProgress;
}

function httpsUrl(u: string | null | undefined): string {
  if (!u) return '';
  return u.replace(/^http:\/\/sapl\.itapoa\.sc\.leg\.br/i, 'https://sapl.itapoa.sc.leg.br');
}

async function fetchJson<T>(url: string, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} em ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface SaplPaginated<T> {
  pagination: {
    total_pages: number;
    total_entries: number;
    next_page: number | null;
  };
  results: T[];
}

async function fetchAllPages<T>(endpointPath: string, timeoutMs = 25000): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  while (true) {
    const sep = endpointPath.includes('?') ? '&' : '?';
    const url = `${SAPL_BASE}${endpointPath}${sep}page=${page}&page_size=100`;
    const data = await fetchJson<SaplPaginated<T>>(url, timeoutMs);
    out.push(...(data.results || []));
    if (!data.pagination?.next_page || page >= (data.pagination.total_pages || 1)) {
      break;
    }
    page = data.pagination.next_page;
  }
  return out;
}

/**
 * Extrai número do parecer no formato "NNN/AAAA" a partir do nome ou do arquivo PDF.
 */
export function extrairNumeroParecer(nome: string, arquivoUrl: string, anoPadrao: number): string {
  const filename = decodeURIComponent((arquivoUrl.split('/').pop() || '').replace(/\.pdf$/i, ''));
  const candidatos = [nome, filename];

  for (const texto of candidatos) {
    // Ex: parecer_742_2026, parecer_527.2026, parecer_juridico_1264_de_2025, 1-_parecer_1434.26, parecer_03_2025
    const regexes = [
      /parecer(?:_[a-z0-9]+)*?[_.\s-]+0*(\d{1,4})[_./\s-]+(?:de[_.\s-]+)?(20\d{2}|\d{2})(?!\d)/i,
      /\bn[ºo.]?\s*0*(\d{1,4})\s*[/._-]\s*(20\d{2}|\d{2})\b/i,
      /(?:^|[_-\s])0*(\d{1,4})\.(20\d{2}|\d{2})(?:[_-\s]|$)/i,
    ];
    for (const rx of regexes) {
      const m = texto.match(rx);
      if (m) {
        const num = String(parseInt(m[1], 10));
        let ano = m[2];
        if (ano.length === 2) ano = `20${ano}`;
        const anoNum = parseInt(ano, 10);
        if (anoNum >= 2020 && anoNum <= 2035) {
          return `${num}/${anoNum}`;
        }
      }
    }
  }

  // Fallback se tiver "parecer NNN 2026"
  const mSimples = nome.match(/(\d{1,4})\s+(202\d)/);
  if (mSimples) {
    return `${parseInt(mSimples[1], 10)}/${mSimples[2]}`;
  }
  void anoPadrao;
  return '';
}

export function classificarPareceres(
  docs: Array<{ nome: string; data: string; autor: string; arquivo: string }>,
  anoMateria: number
): { pareceres: PareceresGroup; outros_pareceres: ParecerItem[] } {
  const pareceres: PareceresGroup = {
    exec_contabil: [],
    exec_juridico: [],
    leg_contabil: [],
    leg_juridico: [],
  };
  const outros_pareceres: ParecerItem[] = [];

  for (const doc of docs) {
    const nome = (doc.nome || '').trim();
    const norm = semAcento(nome);
    if (!norm.includes('parecer')) continue;

    const item: ParecerItem = {
      nome,
      numero: extrairNumeroParecer(nome, doc.arquivo || '', anoMateria),
      data: doc.data || '',
      url: httpsUrl(doc.arquivo),
      ...(doc.autor ? { autor: doc.autor.trim() } : {}),
    };

    const ehExec = norm.includes('executivo');
    const ehLeg = norm.includes('legislativo');
    const ehContabil = norm.includes('contabil');
    const ehJuridico = norm.includes('juridico');

    if (ehContabil && ehExec) {
      pareceres.exec_contabil.push(item);
    } else if (ehJuridico && ehExec) {
      pareceres.exec_juridico.push(item);
    } else if (ehContabil && (ehLeg || !ehExec)) {
      pareceres.leg_contabil.push(item);
    } else if (ehJuridico && (ehLeg || !ehExec)) {
      pareceres.leg_juridico.push(item);
    } else {
      outros_pareceres.push(item);
    }
  }

  return { pareceres, outros_pareceres };
}

export function calcularSituacaoEResultado(
  historicoFull: HistoricoStep[],
  relator: string,
  pareceres: PareceresGroup
): {
  lista_sapl: 'comissoes' | 'encerrados';
  situacao_sapl: string;
  resultado: string;
  ultima: HistoricoStep | null;
  entrada: string | null;
} {
  if (historicoFull.length === 0) {
    return {
      lista_sapl: 'comissoes',
      situacao_sapl: relator ? 'Aguardando parecer jurídico' : 'Aguardando relatoria',
      resultado: '',
      ultima: null,
      entrada: null,
    };
  }

  const ultima = historicoFull[historicoFull.length - 1];
  const distStep = historicoFull.find((h) => h.status === 12);
  const expStep = historicoFull.find((h) => h.status === 52);
  const entrada = distStep?.data || expStep?.data || null;

  const emComissoes = STATUS_EM_COMISSOES.has(ultima.status);
  const lista_sapl: 'comissoes' | 'encerrados' = emComissoes ? 'comissoes' : 'encerrados';

  let situacao_sapl = ultima.descricao;
  if (lista_sapl === 'comissoes') {
    if (ultima.status === 60) {
      situacao_sapl = 'Sobrestada';
    } else if (ultima.status === 59) {
      situacao_sapl = 'Sobrestada a pedido do autor';
    } else if (ultima.status === 83) {
      situacao_sapl = 'No jurídico, aguardando parecer';
    } else if (ultima.status === 54) {
      situacao_sapl = 'Voltou às comissões';
    } else if (ultima.status === 49) {
      situacao_sapl = 'Retirada da pauta';
    } else if (ultima.status === 12 || ultima.status === 52 || ultima.status === 82) {
      if (!relator) {
        situacao_sapl = 'Aguardando relatoria';
      } else if (pareceres.leg_juridico.length > 0) {
        situacao_sapl = 'Parecer jurídico emitido';
      } else {
        situacao_sapl = 'Aguardando parecer jurídico';
      }
    }
  }

  // Calcular resultado (Parecer favorável/contrário + desfecho plenário)
  const partesResultado: string[] = [];
  const parecerFav = [...historicoFull].reverse().find((h) => h.status === 6 || h.status === 32 || h.status === 85);
  const parecerCon = [...historicoFull].reverse().find((h) => h.status === 51 || h.status === 56 || h.status === 78);

  if (parecerFav) {
    partesResultado.push(`Parecer favorável ${dataBR(parecerFav.data)}`);
  } else if (parecerCon) {
    partesResultado.push(`Parecer contrário ${dataBR(parecerCon.data)}`);
  }

  const substituido = [...historicoFull].reverse().find((h) => h.status === 79);
  const retirado = [...historicoFull].reverse().find((h) => h.status === 4);
  const rejeitado = [...historicoFull].reverse().find((h) => h.status === 10);
  const aprovado2 = [...historicoFull].reverse().find((h) => h.status === 65);
  const aprovadoUnica = [...historicoFull].reverse().find((h) => h.status === 9);
  const aprovado1 = [...historicoFull].reverse().find((h) => h.status === 33);
  const sancionadoOuPromulgado = [...historicoFull].reverse().find((h) => h.status === 76 || h.status === 77);

  if (substituido) {
    partesResultado.length = 0;
    partesResultado.push(`Substituído ${dataBR(substituido.data)}`);
  } else if (retirado) {
    partesResultado.push(`Retirado pelo autor ${dataBR(retirado.data)}`);
  } else if (rejeitado) {
    partesResultado.push(`Rejeitado ${dataBR(rejeitado.data)}`);
  } else if (aprovado2) {
    partesResultado.push(`Aprovado ${dataBR(aprovado2.data)}`);
  } else if (aprovadoUnica) {
    partesResultado.push(`Aprovado ${dataBR(aprovadoUnica.data)}`);
  } else if (aprovado1 && sancionadoOuPromulgado) {
    partesResultado.push(`Aprovado ${dataBR(aprovado1.data)}`);
  } else if (aprovado1) {
    partesResultado.push(`Aprovado em 1º turno ${dataBR(aprovado1.data)}`);
  } else if (sancionadoOuPromulgado) {
    partesResultado.push(`Aprovado ${dataBR(sancionadoOuPromulgado.data)}`);
  }

  return {
    lista_sapl,
    situacao_sapl,
    resultado: partesResultado.join(' · '),
    ultima,
    entrada,
  };
}

export async function runSaplSync(forceAll = false): Promise<UltimaSync> {
  if (syncInProgress) {
    const u = getUltimaSync();
    if (u) return u;
  }

  syncInProgress = true;
  const t0 = Date.now();
  let totalMateriasSapl = 0;
  let atualizadas = 0;
  let erros = 0;

  try {
    getDb(); // Ensure DB initialized

    const [tipos, regimes, statuses, unidades, autoresList, parlamentaresList] = await Promise.all([
      fetchAllPages<{ id: number; sigla: string; descricao: string }>('/api/materia/tipomaterialegislativa/'),
      fetchAllPages<{ id: number; descricao: string }>('/api/materia/regimetramitacao/'),
      fetchAllPages<{ id: number; sigla: string; descricao: string }>('/api/materia/statustramitacao/'),
      fetchAllPages<{ id: number; __str__: string }>('/api/materia/unidadetramitacao/'),
      fetchAllPages<{ id: number; __str__: string; nome: string; cargo: string }>('/api/base/autor/'),
      fetchAllPages<{ id: number; nome_parlamentar: string; ativo: boolean }>('/api/parlamentares/parlamentar/'),
    ]);

    const tipoMap = new Map(tipos.map((t) => [t.id, t]));
    const regimeMap = new Map(regimes.map((r) => [r.id, r.descricao]));
    const statusMap = new Map(statuses.map((s) => [s.id, s.descricao]));
    const unidadeMap = new Map(unidades.map((u) => [u.id, u.__str__]));
    const autorMap = new Map(autoresList.map((a) => [a.id, a]));
    const parlamentarMap = new Map(parlamentaresList.map((p) => [p.id, p.nome_parlamentar]));

    // Atualizar lista de vereadores da CP (Composição 32 = CP 2025-2026)
    try {
      const partCp = await fetchAllPages<{
        parlamentar: number;
        titular: boolean;
        data_desligamento: string | null;
      }>('/api/comissoes/participacao/?composicao=32');
      const nomesCp = partCp
        .filter((p) => !p.data_desligamento)
        .map((p) => parlamentarMap.get(p.parlamentar) || '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt'));
      if (nomesCp.length >= 5) {
        setVereadores(Array.from(new Set(nomesCp)));
      }
    } catch {
      // keep existing vereadores list
    }

    const existingMeta = getExistingMateriasMeta();

    interface RawMateriaSapl {
      id: number;
      numero: number;
      ano: number;
      data_apresentacao: string;
      ementa: string;
      texto_original: string | null;
      data_ultima_atualizacao: string;
      tipo: number;
      regime_tramitacao: number;
      autores: number[];
      em_tramitacao: boolean;
    }

    const candidatas: RawMateriaSapl[] = [];

    for (const ano of ANOS_MONITORADOS) {
      const materiasAno = await fetchAllPages<RawMateriaSapl>(`/api/materia/materialegislativa/?ano=${ano}`);
      totalMateriasSapl += materiasAno.length;
      for (const m of materiasAno) {
        if (TIPOS_MONITORADOS.has(m.tipo)) {
          candidatas.push(m);
        }
      }
    }

    // Filtra apenas matérias novas, alteradas no SAPL ou atualmente na aba 'comissoes'
    const paraAtualizar = candidatas.filter((m) => {
      if (forceAll) return true;
      const ex = existingMeta.get(m.id);
      if (!ex) return m.em_tramitacao; // Matéria nova em tramitação
      if (ex.lista_sapl === 'comissoes') return true; // Sempre revalida as que estão nas comissões
      if (m.data_ultima_atualizacao && ex.data_ultima_atualizacao && m.data_ultima_atualizacao !== ex.data_ultima_atualizacao) {
        return true;
      }
      return false;
    });

    // Processa em lotes de 6 requisições concorrentes para não sobrecarregar o SAPL
    const BATCH_SIZE = 6;
    for (let i = 0; i < paraAtualizar.length; i += BATCH_SIZE) {
      const batch = paraAtualizar.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (m) => {
          try {
            const [tramitacoes, docs, relatorias] = await Promise.all([
              fetchAllPages<{
                id: number;
                data_tramitacao: string;
                status: number;
                unidade_tramitacao_destino: number;
                texto: string;
              }>(`/api/materia/tramitacao/?materia=${m.id}`),
              fetchAllPages<{
                id: number;
                nome: string;
                data: string;
                autor: string;
                arquivo: string;
              }>(`/api/materia/documentoacessorio/?materia=${m.id}`),
              fetchAllPages<{
                id: number;
                parlamentar: number;
                comissao: number;
                data_destituicao_relator: string | null;
              }>(`/api/materia/relatoria/?materia=${m.id}`),
            ]);

            // Se for matéria que nunca passou por comissão nem está no banco, verifica se tem tramitação relevante
            if (!existingMeta.has(m.id) && tramitacoes.length === 0) {
              return;
            }

            // Ordena tramitações em ordem cronológica crescente (no SAPL vem decrescente)
            const tramOrdenadas = [...tramitacoes].reverse();
            const historicoFull: HistoricoStep[] = tramOrdenadas.map((t) => ({
              data: t.data_tramitacao,
              status: t.status,
              descricao: statusMap.get(t.status) || '',
              destino: unidadeMap.get(t.unidade_tramitacao_destino) || '',
              texto: (t.texto || '').trim(),
            }));

            // Relator (prioriza comissão 6 = CP ativa)
            const relAtiva =
              relatorias.find((r) => r.comissao === 6 && !r.data_destituicao_relator) ||
              relatorias.find((r) => !r.data_destituicao_relator) ||
              relatorias[0];
            const relator = relAtiva ? parlamentarMap.get(relAtiva.parlamentar) || '' : '';

            // Autores
            let idsAutores = m.autores || [];
            if (idsAutores.length === 0) {
              const autorias = await fetchAllPages<{ autor: number }>(`/api/materia/autoria/?materia=${m.id}`);
              idsAutores = autorias.map((a) => a.autor);
            }
            const objsAutores = idsAutores.map((aid) => autorMap.get(aid)).filter(Boolean);
            const nomesAutores = objsAutores.map((a) => a!.__str__ || a!.nome).filter(Boolean);
            const executivo = objsAutores.some(
              (a) =>
                /prefeito|executivo/i.test(a?.cargo || '') ||
                /prefeito|executivo/i.test(a?.__str__ || '')
            );

            const { pareceres, outros_pareceres } = classificarPareceres(docs, m.ano);
            const { lista_sapl, situacao_sapl, resultado, ultima, entrada } = calcularSituacaoEResultado(
              historicoFull,
              relator,
              pareceres
            );

            const tipoObj = tipoMap.get(m.tipo);
            const sigla = tipoObj?.sigla || 'MAT';
            const historicoPayload =
              lista_sapl === 'encerrados' ? historicoFull.slice(-4) : historicoFull;

            const linha: LinhaMateria = {
              id: m.id,
              sigla,
              numero: m.numero,
              ano: m.ano,
              titulo: `${sigla} ${m.numero}/${m.ano}`,
              ementa: (m.ementa || '').trim(),
              autores: nomesAutores.join(', '),
              executivo,
              relator,
              entrada: entrada || m.data_apresentacao,
              apresentacao: m.data_apresentacao,
              regime: regimeMap.get(m.regime_tramitacao) || 'Ordinária',
              url: `${SAPL_BASE}/materia/${m.id}`,
              pdf: httpsUrl(m.texto_original),
              pareceres,
              outros_pareceres,
              ultima,
              situacao_sapl,
              resultado,
              historico: historicoPayload,
              lista: lista_sapl,
              lista_sapl,
              nota: null,
              data_ultima_atualizacao: m.data_ultima_atualizacao || '',
            };

            upsertMateriaFromSapl(linha, m.data_ultima_atualizacao || '');
            atualizadas++;
          } catch {
            erros++;
          }
        })
      );
    }

    const segundos = Number(((Date.now() - t0) / 1000).toFixed(1));
    const syncMeta: UltimaSync = {
      em: agoraLocalTimestamp(),
      materias: totalMateriasSapl || 1737,
      atualizadas,
      erros,
      segundos,
    };
    setUltimaSync(syncMeta);
    return syncMeta;
  } finally {
    syncInProgress = false;
  }
}
