'use client';

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  aguardaJuridico,
  autoresDe,
  corDaLinha,
  dataBR,
  dataHoraBR,
  diasDesde,
  doExecutivo,
  ehCtmrb,
  NOME_ABA,
  notaDe,
  PARECERES,
  parecerPrevisto,
  relatorDe,
  ROTULO_PARECER,
  seisMeses,
  semAcento,
  SUGESTOES_PADRAO,
  temParecer,
  temSapl,
} from '@/core/rules';
import { AbaLista, DadosPayload, LinhaMateria, NotaJuridico, SlotParecer } from '@/core/types';

interface ComissoesClientProps {
  initialData: DadosPayload;
}

type OrdemColuna =
  | 'entrada'
  | 'proposicao'
  | 'relator'
  | 'ementa'
  | 'exec_contabil'
  | 'exec_juridico'
  | 'leg_contabil'
  | 'leg_juridico'
  | 'situacao'
  | 'resultado'
  | 'observacoes';

export default function ComissoesClient({ initialData }: ComissoesClientProps) {
  const [linhas, setLinhas] = useState<LinhaMateria[]>(initialData.linhas);
  const [ultima, setUltima] = useState(initialData.ultima);
  const [hoje] = useState(initialData.hoje);
  const [csrf] = useState(initialData.csrf);
  const [vereadores] = useState<string[]>(initialData.vereadores);

  const [aba, setAba] = useState<AbaLista>('comissoes');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [relator, setRelator] = useState('');
  const [autor, setAutor] = useState('');
  const [situacao, setSituacao] = useState('');
  const [ordem, setOrdem] = useState<OrdemColuna>('entrada');
  const [dir, setDir] = useState<1 | -1>(-1);
  const [aberto, setAberto] = useState<number | null>(null);

  const [avisoTexto, setAvisoTexto] = useState('');
  const [avisoVisivel, setAvisoVisivel] = useState(false);
  const avisoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [atualizandoSapl, setAtualizandoSapl] = useState(false);
  const [nomeEditorPadrao, setNomeEditorPadrao] = useState('');

  // Estado do formulário de edição e status da mensagem
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [msgForm, setMsgForm] = useState<{ id: number; tipo: '' | 'ok' | 'erro'; texto: string } | null>(null);

  // Modal de senha do administrador
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputSenhaRef = useRef<HTMLInputElement | null>(null);
  const [modalTexto, setModalTexto] = useState('');
  const [modalSenhaValor, setModalSenhaValor] = useState('');
  const resolverSenhaRef = useRef<((val: string | null) => void) | null>(null);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('comissoes_nome') || '';
      setNomeEditorPadrao(salvo);
    } catch {
      // sem localStorage
    }
  }, []);

  function mostrarAviso(t: string) {
    setAvisoTexto(t);
    setAvisoVisivel(true);
    if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current);
    avisoTimerRef.current = setTimeout(() => {
      setAvisoVisivel(false);
    }, 6000);
  }

  function pedirSenha(texto: string): Promise<string | null> {
    setModalTexto(texto);
    setModalSenhaValor('');
    const dlg = dialogRef.current;
    if (dlg && !dlg.open) {
      dlg.showModal();
    }
    setTimeout(() => {
      inputSenhaRef.current?.focus();
    }, 20);
    return new Promise((resolve) => {
      resolverSenhaRef.current = resolve;
    });
  }

  function fecharModalSenha(valor: string | null) {
    const dlg = dialogRef.current;
    if (dlg && dlg.open) {
      dlg.close();
    }
    if (resolverSenhaRef.current) {
      const fn = resolverSenhaRef.current;
      resolverSenhaRef.current = null;
      fn(valor);
    }
  }

  // Contagens por aba
  const contagensAbas = useMemo(() => {
    let comissoes = 0;
    let encerrados = 0;
    let retirados = 0;
    for (const l of linhas) {
      if (l.lista === 'comissoes') comissoes++;
      else if (l.lista === 'encerrados') encerrados++;
      else if (l.lista === 'retirados') retirados++;
    }
    return { comissoes, encerrados, retirados };
  }, [linhas]);

  // Opções dinâmicas de Relator, Autor e Situação na aba ativa
  const daAba = useMemo(() => linhas.filter((l) => l.lista === aba), [linhas, aba]);

  const opcoesRelator = useMemo(() => {
    const vals = daAba.map(relatorDe).filter(Boolean);
    return Array.from(new Set(vals)).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [daAba]);

  const opcoesAutor = useMemo(() => {
    const vals = daAba.flatMap(autoresDe);
    return Array.from(new Set(vals)).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [daAba]);

  const opcoesSituacao = useMemo(() => {
    const vals = daAba.map((l) => l.situacao_sapl).filter(Boolean);
    return Array.from(new Set(vals)).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [daAba]);

  // Limpa filtro se trocar de aba e a opção não existir mais
  useEffect(() => {
    if (relator && !opcoesRelator.includes(relator)) setRelator('');
    if (autor && !opcoesAutor.includes(autor)) setAutor('');
    if (situacao && !opcoesSituacao.includes(situacao)) setSituacao('');
  }, [aba, opcoesRelator, opcoesAutor, opcoesSituacao, relator, autor, situacao]);

  // Sugestões dinâmicas de situação manual
  const sugestoesSituacao = useMemo(() => {
    const usadas = linhas.map((l) => notaDe(l).situacao || '').filter(Boolean);
    return Array.from(new Set([...SUGESTOES_PADRAO, ...usadas]));
  }, [linhas]);

  // Contadores das 4 pílulas de legenda na aba "Nas comissões"
  const contagensLegenda = useMemo(() => {
    const nas = linhas.filter((l) => l.lista === 'comissoes');
    return {
      'c-jur': nas.filter((l) => aguardaJuridico(l)).length,
      'c-ctmrb': nas.filter((l) => ehCtmrb(l)).length,
      'c-seis': nas.filter((l) => seisMeses(l, hoje)).length,
      'c-prev': nas.filter((l) => parecerPrevisto(l)).length,
    };
  }, [linhas, hoje]);

  // Filtragem e Ordenação client-side
  const linhasVisiveis = useMemo(() => {
    const q = semAcento(busca).trim();
    let r = [...daAba];

    if (q) {
      const qNoSpace = q.replace(/\s/g, '');
      r = r.filter((l) => {
        const n = notaDe(l);
        const alvo = semAcento(
          [l.titulo, l.ementa, l.autores, relatorDe(l), n.situacao, n.observacoes].join(' ')
        );
        return (
          alvo.includes(q) ||
          semAcento(`${l.sigla} ${l.numero}`).includes(q) ||
          semAcento(`${l.sigla}${l.numero}`).includes(qNoSpace)
        );
      });
    }

    if (relator) r = r.filter((l) => relatorDe(l) === relator);
    if (autor) r = r.filter((l) => autoresDe(l).includes(autor));
    if (situacao) r = r.filter((l) => l.situacao_sapl === situacao);

    if (filtro) {
      const fnFiltro: Record<string, (l: LinhaMateria) => boolean> = {
        sem_relator: (l) => !relatorDe(l),
        'c-jur': (l) => aguardaJuridico(l),
        'c-ctmrb': (l) => ehCtmrb(l),
        'c-seis': (l) => seisMeses(l, hoje),
        'c-prev': (l) => parecerPrevisto(l),
        sem_executivo: (l) =>
          doExecutivo(l) && (!temParecer(l, 'exec_contabil') || !temParecer(l, 'exec_juridico')),
        parados: (l) => (diasDesde(l.ultima?.data, hoje) ?? 0) > 30,
        urgencia: (l) => /urg/i.test(l.regime),
        com_obs: (l) => Boolean((notaDe(l).observacoes || '').trim()),
        manual: (l) => PARECERES.some((c) => !temSapl(l, c) && Boolean(notaDe(l)[c])),
      };
      const f = fnFiltro[filtro];
      if (f) r = r.filter(f);
    }

    const chaveParecer = (c: SlotParecer) => (l: LinhaMateria) => {
      const p = (l.pareceres[c] || [])[0];
      if (p && p.numero) {
        const [n, a] = p.numero.split('/');
        return `0|${a || ''}|${(n || '').padStart(5, '0')}`;
      }
      if (p) return '1';
      const man = notaDe(l)[c];
      return man ? `2|${semAcento(man)}` : '3';
    };

    const chaves: Record<OrdemColuna, (l: LinhaMateria) => string> = {
      entrada: (l) => `${l.entrada}|${String(l.ano)}|${String(l.numero).padStart(4, '0')}`,
      proposicao: (l) => `${l.sigla}|${l.ano}|${String(l.numero).padStart(4, '0')}`,
      relator: (l) => semAcento(relatorDe(l)) || '~',
      ementa: (l) => semAcento(l.ementa),
      situacao: (l) =>
        `${semAcento(l.situacao_sapl) || '~'}|${String(
          99999 - (diasDesde(l.ultima?.data, hoje) ?? 0)
        ).padStart(5, '0')}`,
      resultado: (l) => semAcento(l.resultado) || '~',
      observacoes: (l) => semAcento(notaDe(l).observacoes) || '~',
      exec_contabil: chaveParecer('exec_contabil'),
      exec_juridico: chaveParecer('exec_juridico'),
      leg_contabil: chaveParecer('leg_contabil'),
      leg_juridico: chaveParecer('leg_juridico'),
    };

    const fnChave = chaves[ordem] || ((l: LinhaMateria) => l.entrada);
    return r.sort((a, b) => {
      const ca = fnChave(a);
      const cb = fnChave(b);
      return ca < cb ? -dir : ca > cb ? dir : 0;
    });
  }, [daAba, busca, relator, autor, situacao, filtro, ordem, dir, hoje]);

  // Status de sincronização
  const infoSync = useMemo(() => {
    if (!ultima || !ultima.em) {
      return { texto: 'Ainda não sincronizado com o SAPL', atrasada: true };
    }
    const [d, h] = ultima.em.split(' ');
    const ts = new Date(ultima.em.replace(' ', 'T') + '-03:00').getTime();
    const horas = (Date.now() - ts) / 3600000;
    const texto =
      `Dados do SAPL de ${dataBR(d)} às ${(h || '').slice(0, 5)}` +
      (ultima.erros ? ` · ${ultima.erros} matéria(s) não atualizada(s)` : '');
    return {
      texto,
      atrasada: horas > 2 || ultima.erros > 0,
    };
  }, [ultima]);

  function alternarOrdem(col: OrdemColuna) {
    if (ordem === col) {
      setDir((d) => (d === 1 ? -1 : 1));
    } else {
      setOrdem(col);
      setDir(col === 'entrada' ? -1 : 1);
    }
  }

  function renderSeta(col: OrdemColuna) {
    if (ordem !== col) return null;
    return <span className="seta">{dir < 0 ? '▼' : '▲'}</span>;
  }

  async function handleAtualizarSapl() {
    setAtualizandoSapl(true);
    const antes = ultima ? ultima.em : '';
    try {
      const r = await fetch('atualizar.php', {
        method: 'POST',
        headers: { 'X-CSRF': csrf },
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) {
        throw new Error(j.erro || 'Falhou.');
      }
      if (j.recente) {
        window.location.reload();
        return;
      }
      const limite = Date.now() + 5 * 60000;
      while (Date.now() < limite) {
        await new Promise((ok) => setTimeout(ok, 3000));
        const sr = await fetch('atualizar.php');
        const sj = await sr.json();
        if (sj.ultima && sj.ultima.em !== antes) {
          const dr = await fetch('/api/dados');
          if (dr.ok) {
            const dj = (await dr.json()) as DadosPayload;
            setLinhas(dj.linhas);
            setUltima(dj.ultima);
            setAtualizandoSapl(false);
            mostrarAviso(
              `Sincronização concluída (${dj.ultima?.atualizadas ?? 0} proposições verificadas/atualizadas).`
            );
            return;
          }
          window.location.reload();
          return;
        }
      }
      throw new Error('O SAPL demorou a responder. Tente de novo em alguns minutos.');
    } catch (err) {
      setAtualizandoSapl(false);
      alert(err instanceof Error ? err.message : 'Erro ao sincronizar com o SAPL.');
    }
  }

  async function handleSalvarNota(e: React.FormEvent<HTMLFormElement>, l0: LinhaMateria) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const por = String(fd.get('por') ?? '').trim();

    if (!por) {
      setMsgForm({ id: l0.id, tipo: 'erro', texto: 'Informe seu nome.' });
      const porInput = form.querySelector<HTMLInputElement>('input[name="por"]');
      porInput?.focus();
      return;
    }

    const listaManualForm = String(fd.get('lista_manual') ?? '') as '' | AbaLista;
    const listaManualAtual = (l0.nota?.lista_manual || '') as '' | AbaLista;

    const payload: Record<string, unknown> = {
      materia_id: l0.id,
      por,
      relator: String(fd.get('relator') ?? ''),
      situacao: String(fd.get('situacao') ?? ''),
      observacoes: String(fd.get('observacoes') ?? ''),
      exec_contabil: String(fd.get('exec_contabil') ?? ''),
      exec_juridico: String(fd.get('exec_juridico') ?? ''),
      leg_contabil: String(fd.get('leg_contabil') ?? ''),
      leg_juridico: String(fd.get('leg_juridico') ?? ''),
    };

    if (listaManualForm !== listaManualAtual) {
      const destino = listaManualForm
        ? NOME_ABA[listaManualForm]
        : `automático pelo SAPL (${NOME_ABA[l0.lista_sapl]})`;
      const senha = await pedirSenha(`${l0.titulo} vai para: ${destino}.`);
      if (senha === null) {
        setMsgForm({ id: l0.id, tipo: '', texto: 'Mudança de aba cancelada. Nada foi salvo.' });
        return;
      }
      payload.lista_manual = listaManualForm;
      payload.senha_admin = senha;
    }

    try {
      localStorage.setItem('comissoes_nome', por);
      setNomeEditorPadrao(por);
    } catch {
      // ignore
    }

    setSalvandoId(l0.id);
    setMsgForm({ id: l0.id, tipo: '', texto: 'Salvando...' });

    try {
      const r = await fetch('salvar.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF': csrf,
        },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        erro?: string;
        mudou?: boolean;
        nota?: NotaJuridico;
      };
      if (!r.ok || !j.ok || !j.nota) {
        throw new Error(j.erro || 'Não foi possível salvar.');
      }

      const novaNota = j.nota;
      const novaLista: AbaLista = (novaNota.lista_manual || l0.lista_sapl) as AbaLista;
      const mudouDeAba = novaLista !== l0.lista;

      setLinhas((prev) =>
        prev.map((item) =>
          item.id === l0.id
            ? {
                ...item,
                nota: novaNota,
                lista: novaLista,
              }
            : item
        )
      );

      setSalvandoId(null);

      if (mudouDeAba) {
        setAberto(null);
        setMsgForm(null);
        mostrarAviso(`${l0.titulo} foi para ${NOME_ABA[novaLista]}.`);
      } else {
        setMsgForm({
          id: l0.id,
          tipo: 'ok',
          texto: j.mudou ? 'Salvo.' : 'Nada mudou.',
        });
      }
    } catch (err) {
      setSalvandoId(null);
      setMsgForm({
        id: l0.id,
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível salvar.',
      });
    }
  }

  return (
    <>
      <header className="topo">
        <div className="topo-in">
          <div className="marca">
            <img src="/logo-camara.png" alt="Câmara Municipal de Itapoá" />
            <div>
              <h1>Controle de Projetos nas Comissões</h1>
              <p>Câmara Municipal de Itapoá · Comissões Permanentes 2025-2026</p>
            </div>
          </div>
          <div className={`sync${infoSync.atrasada ? ' atrasada' : ''}`} id="sync">
            {infoSync.texto}
          </div>
          <div className="acoes">
            <button
              className="btn prim"
              id="btn-atualizar"
              type="button"
              disabled={atualizandoSapl}
              onClick={handleAtualizarSapl}
            >
              {atualizandoSapl ? 'Buscando no SAPL...' : 'Atualizar do SAPL'}
            </button>
            <a className="btn" id="btn-exportar" href={`exportar.php?lista=${aba}`}>
              Baixar planilha
            </a>
            <button className="btn so-pc" type="button" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
        </div>
      </header>

      <main>
        <div className="abas" role="tablist">
          <button
            className="aba"
            role="tab"
            data-aba="comissoes"
            aria-selected={aba === 'comissoes'}
            onClick={() => {
              setAba('comissoes');
              setAberto(null);
            }}
          >
            <span className="longo">Nas comissões</span>
            <span className="curto">Comissões</span>{' '}
            <span className="n" id="n-comissoes">
              {contagensAbas.comissoes}
            </span>
          </button>
          <button
            className="aba"
            role="tab"
            data-aba="encerrados"
            aria-selected={aba === 'encerrados'}
            onClick={() => {
              setAba('encerrados');
              setAberto(null);
            }}
          >
            Encerrados{' '}
            <span className="n" id="n-encerrados">
              {contagensAbas.encerrados}
            </span>
          </button>
          <button
            className="aba"
            role="tab"
            data-aba="retirados"
            aria-selected={aba === 'retirados'}
            onClick={() => {
              setAba('retirados');
              setAberto(null);
            }}
          >
            Retirados{' '}
            <span className="n" id="n-retirados">
              {contagensAbas.retirados}
            </span>
          </button>
        </div>

        <div className="filtros">
          <input
            type="search"
            id="busca"
            placeholder="Buscar por número, ementa, autor ou relator"
            aria-label="Buscar"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            id="filtro"
            aria-label="Mostrar"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="sem_relator">Sem relator</option>
            <option value="c-jur">Aguardando parecer jurídico</option>
            <option value="c-ctmrb">Parecer da CTMRB</option>
            <option value="c-seis">Mais de 6 meses tramitando</option>
            <option value="c-prev">Parecer previsto</option>
            <option value="sem_executivo">Do Executivo, sem os pareceres do Executivo</option>
            <option value="parados">Parados há mais de 30 dias</option>
            <option value="urgencia">Em regime de urgência</option>
            <option value="com_obs">Com observação</option>
            <option value="manual">Com parecer anotado à mão (falta publicar no SAPL)</option>
          </select>
          <select
            id="relator"
            aria-label="Relator"
            value={relator}
            onChange={(e) => setRelator(e.target.value)}
          >
            <option value="">Todos os relatores</option>
            {opcoesRelator.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            id="autor"
            aria-label="Autor"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
          >
            <option value="">Todos os autores</option>
            {opcoesAutor.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            id="situacao"
            aria-label="Situação"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
          >
            <option value="">Todas as situações</option>
            {opcoesSituacao.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="contagem" id="contagem">
            {linhasVisiveis.length === daAba.length
              ? `${daAba.length} projetos`
              : `${linhasVisiveis.length} de ${daAba.length} projetos`}
          </span>
        </div>

        <p className="aviso" id="aviso" role="status" hidden={!avisoVisivel}>
          {avisoTexto}
        </p>

        <div className="legenda" id="legenda" hidden={aba !== 'comissoes'}>
          {(
            [
              ['c-jur', 'Aguardando parecer jurídico', 'Parecer jurídico'],
              ['c-ctmrb', 'Parecer da CTMRB', 'CTMRB'],
              ['c-seis', 'Mais de 6 meses tramitando', '+6 meses'],
              ['c-prev', 'Parecer previsto', 'Previsto'],
            ] as const
          ).map(([cod, rotulo, curto]) => (
            <button
              key={cod}
              type="button"
              className="leg"
              data-filtro={cod}
              aria-pressed={filtro === cod}
              title={rotulo}
              onClick={() => setFiltro((f) => (f === cod ? '' : cod))}
            >
              <i
                style={{
                  background: `var(--${cod})`,
                  boxShadow: `inset 0 0 0 2px var(--${cod}-b)`,
                }}
              />
              <span className="longo">{rotulo}</span>
              <span className="curto">{curto}</span> <b>{contagensLegenda[cod]}</b>
            </button>
          ))}
        </div>

        <div className="tabela-wrap">
          <table>
            <thead id="cabecalho">
              <tr>
                <th rowSpan={2} data-ordem="entrada" onClick={() => alternarOrdem('entrada')}>
                  Entrada {renderSeta('entrada')}
                </th>
                <th rowSpan={2} data-ordem="proposicao" onClick={() => alternarOrdem('proposicao')}>
                  Proposição {renderSeta('proposicao')}
                </th>
                <th rowSpan={2} data-ordem="relator" onClick={() => alternarOrdem('relator')}>
                  Relator {renderSeta('relator')}
                </th>
                <th rowSpan={2} data-ordem="ementa" onClick={() => alternarOrdem('ementa')}>
                  Ementa {renderSeta('ementa')}
                </th>
                <th colSpan={2} className="grupo">
                  Executivo
                </th>
                <th colSpan={2} className="grupo">
                  Legislativo
                </th>
                {aba === 'comissoes' ? (
                  <th rowSpan={2} data-ordem="situacao" onClick={() => alternarOrdem('situacao')}>
                    Situação {renderSeta('situacao')}
                  </th>
                ) : (
                  <th rowSpan={2} data-ordem="resultado" onClick={() => alternarOrdem('resultado')}>
                    Resultado {renderSeta('resultado')}
                  </th>
                )}
                <th rowSpan={2} data-ordem="observacoes" onClick={() => alternarOrdem('observacoes')}>
                  Observações {renderSeta('observacoes')}
                </th>
              </tr>
              <tr>
                {PARECERES.map((c) => (
                  <th key={c} data-ordem={c} onClick={() => alternarOrdem(c)}>
                    {c.endsWith('contabil') ? 'Contábil' : 'Jurídico'} {renderSeta(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody id="corpo">
              {linhasVisiveis.length === 0 ? (
                <tr>
                  <td colSpan={10} className="vazio-lista">
                    Nenhum projeto com esse filtro.
                  </td>
                </tr>
              ) : (
                linhasVisiveis.map((l) => {
                  const n = notaDe(l);
                  const dias = diasDesde(l.ultima?.data, hoje);
                  const isUrgente = /urg/i.test(l.regime);
                  const obs = (n.observacoes || '').trim();
                  const cor = aba === 'comissoes' ? corDaLinha(l, hoje) : '';
                  const isAberta = aberto === l.id;
                  const relEfetivo = relatorDe(l);

                  const todosPareceresSapl = [
                    ...PARECERES.flatMap((slot) => l.pareceres[slot] || []),
                    ...(l.outros_pareceres || []),
                  ];
                  const tramReversa = [...(l.historico || [])].reverse();
                  const abaAutoLabel =
                    l.lista_sapl === 'comissoes' ? 'Nas comissões' : 'Encerrados';

                  return (
                    <Fragment key={l.id}>
                      <tr
                        className={`linha${cor ? ` ${cor}` : ''}${isAberta ? ' aberta' : ''}`}
                        data-id={l.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('a')) return;
                          setAberto((curr) => (curr === l.id ? null : l.id));
                          setMsgForm(null);
                        }}
                      >
                        <td className="entrada">{dataBR(l.entrada)}</td>
                        <td className="prop-td">
                          <button className="prop" type="button" aria-expanded={isAberta}>
                            {l.titulo}
                          </button>
                          <span className="autor">{l.autores}</span>
                          {isUrgente && <span className="selo">{l.regime.split(' (')[0]}</span>}
                        </td>
                        <td
                          className={`relator${relEfetivo ? '' : ' vazio-cel'}`}
                          data-rotulo="Relator"
                        >
                          {l.relator ? (
                            l.relator
                          ) : n.relator ? (
                            <span
                              className="par-manual"
                              title="Designado na reunião. Ainda não lançado no SAPL."
                            >
                              {n.relator}
                            </span>
                          ) : null}
                        </td>
                        <td className="ementa" data-rotulo="Ementa">
                          <div className="clamp">{l.ementa}</div>
                        </td>
                        {PARECERES.map((c) => {
                          const itens = l.pareceres[c] || [];
                          const manualVal = n[c];
                          return (
                            <td key={c} className="par" data-rotulo={ROTULO_PARECER[c]}>
                              {itens.length > 0 ? (
                                <>
                                  <a
                                    className="par-ok"
                                    href={itens[0].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`${itens[0].nome} · ${dataBR(itens[0].data)}${
                                      itens[0].autor ? ` · ${itens[0].autor}` : ''
                                    }`}
                                  >
                                    {itens[0].numero || 'anexado'}
                                  </a>
                                  {itens.length > 1 && (
                                    <span
                                      className="mais"
                                      title={itens
                                        .slice(1)
                                        .map((x) => x.nome)
                                        .join(', ')}
                                    >
                                      {' '}
                                      +{itens.length - 1}
                                    </span>
                                  )}
                                </>
                              ) : manualVal ? (
                                <span
                                  className="par-manual"
                                  title="Anotado à mão. Ainda não está publicado no SAPL."
                                >
                                  {manualVal}
                                </span>
                              ) : (
                                <span className="par-vazio" title="Sem parecer">
                                  ·
                                </span>
                              )}
                            </td>
                          );
                        })}
                        {aba === 'comissoes' ? (
                          <td className="situacao" data-rotulo="Situação">
                            {n.situacao && <div className="sit-manual">{n.situacao}</div>}
                            <div className="sit-sapl">
                              {l.situacao_sapl}
                              {l.ultima ? ` · ${dataBR(l.ultima.data)}` : ''}{' '}
                              {dias !== null && (
                                <span className={`dias${dias > 30 ? ' alerta' : ''}`}>
                                  · há {dias} dia{dias === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                          </td>
                        ) : (
                          <td className="resultado" data-rotulo="Resultado">
                            {l.resultado}
                            {n.situacao && <div className="sit-sapl">{n.situacao}</div>}
                          </td>
                        )}
                        <td className={`obs${obs ? '' : ' vazio-cel'}`} data-rotulo="Observações">
                          <div className="clamp">{obs}</div>
                        </td>
                      </tr>

                      {isAberta && (
                        <tr className="detalhe">
                          <td colSpan={10}>
                            <div className="det">
                              <div>
                                <h3>Ementa</h3>
                                <p>{l.ementa}</p>
                                <p>
                                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                                    Ficha no SAPL
                                  </a>
                                  {l.pdf && (
                                    <>
                                      {' · '}
                                      <a href={l.pdf} target="_blank" rel="noopener noreferrer">
                                        Texto do projeto (PDF)
                                      </a>
                                    </>
                                  )}
                                </p>
                                <p className="sit-sapl">
                                  Autor: {l.autores || 'não informado'} · Relator:{' '}
                                  {relEfetivo || 'não designado'}
                                  {!l.relator && n.relator ? ' (ainda não lançado no SAPL)' : ''} ·
                                  Regime: {l.regime || 'não informado'}
                                </p>
                                <h3>Pareceres publicados no SAPL</h3>
                                {todosPareceresSapl.length > 0 ? (
                                  <ul>
                                    {todosPareceresSapl.map((p, idx) => (
                                      <li key={`${p.url}-${idx}`}>
                                        <a href={p.url} target="_blank" rel="noopener noreferrer">
                                          {p.nome}
                                          {p.numero ? ` nº ${p.numero}` : ''}
                                        </a>{' '}
                                        · {dataBR(p.data)}
                                        {p.autor ? ` · ${p.autor}` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="sit-sapl">Nenhum parecer publicado ainda.</p>
                                )}
                                <h3>
                                  Tramitação
                                  {l.lista === 'encerrados' ? ' (últimos passos)' : ''}
                                </h3>
                                <ol className="tram">
                                  {tramReversa.length > 0 ? (
                                    tramReversa.map((h, idx) => (
                                      <li key={`${h.data}-${h.status}-${idx}`}>
                                        <span className="d">{dataBR(h.data)}</span>
                                        {h.descricao}
                                        {h.texto && <span className="t">{h.texto}</span>}
                                      </li>
                                    ))
                                  ) : (
                                    <li>Sem tramitação no SAPL.</li>
                                  )}
                                </ol>
                              </div>

                              <form
                                className="editar"
                                data-id={l.id}
                                autoComplete="off"
                                onSubmit={(e) => handleSalvarNota(e, l)}
                              >
                                <h3>Anotações do jurídico</h3>
                                <label htmlFor={`por-${l.id}`}>Quem está editando</label>
                                <input
                                  id={`por-${l.id}`}
                                  name="por"
                                  required
                                  autoComplete="off"
                                  defaultValue={nomeEditorPadrao}
                                  placeholder="Seu nome"
                                />
                                <label htmlFor={`rel-${l.id}`}>Relator designado na reunião</label>
                                <input
                                  id={`rel-${l.id}`}
                                  name="relator"
                                  list="vereadores"
                                  autoComplete="off"
                                  defaultValue={n.relator || ''}
                                  placeholder={
                                    l.relator ? `No SAPL: ${l.relator}` : 'Nome do vereador'
                                  }
                                />
                                <label htmlFor={`sit-${l.id}`}>Situação</label>
                                <input
                                  id={`sit-${l.id}`}
                                  name="situacao"
                                  list="sugestoes"
                                  autoComplete="off"
                                  defaultValue={n.situacao || ''}
                                  placeholder={l.situacao_sapl}
                                />
                                <label htmlFor={`obs-${l.id}`}>Observações</label>
                                <textarea
                                  id={`obs-${l.id}`}
                                  name="observacoes"
                                  rows={4}
                                  autoComplete="off"
                                  defaultValue={n.observacoes || ''}
                                />
                                <fieldset>
                                  <legend>Parecer já feito e ainda não publicado no SAPL</legend>
                                  <div className="quatro">
                                    {PARECERES.map((c) => (
                                      <div key={c}>
                                        <label htmlFor={`p-${c}-${l.id}`}>{ROTULO_PARECER[c]}</label>
                                        <input
                                          id={`p-${c}-${l.id}`}
                                          name={c}
                                          autoComplete="off"
                                          defaultValue={n[c] || ''}
                                          placeholder={temSapl(l, c) ? 'já no SAPL' : 'nº ou OK'}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </fieldset>
                                <label htmlFor={`lista-${l.id}`}>
                                  Em qual aba aparece{' '}
                                  <small>(mudar pede a senha do administrador ao salvar)</small>
                                </label>
                                <select
                                  id={`lista-${l.id}`}
                                  name="lista_manual"
                                  defaultValue={n.lista_manual || ''}
                                >
                                  <option value="">
                                    Automático pelo SAPL (hoje: {abaAutoLabel})
                                  </option>
                                  <option value="comissoes">Manter em Nas comissões</option>
                                  <option value="encerrados">Mover para Encerrados</option>
                                  <option value="retirados">Retirar da lista</option>
                                </select>
                                <div className="salvar-linha">
                                  <button
                                    className="btn prim"
                                    type="submit"
                                    disabled={salvandoId === l.id}
                                  >
                                    Salvar
                                  </button>
                                  <span
                                    className={`msg${
                                      msgForm?.id === l.id && msgForm.tipo ? ` ${msgForm.tipo}` : ''
                                    }`}
                                    role="status"
                                  >
                                    {msgForm?.id === l.id ? msgForm.texto : ''}
                                  </span>
                                </div>
                                {n.editado_por && (
                                  <p className="ultima-ed">
                                    Última edição: {n.editado_por} em {dataHoraBR(n.editado_em)}
                                  </p>
                                )}
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <datalist id="sugestoes">
        {sugestoesSituacao.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <dialog
        id="modal-senha"
        className="modal"
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          fecharModalSenha(null);
        }}
      >
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            if (!modalSenhaValor) {
              inputSenhaRef.current?.focus();
              return;
            }
            fecharModalSenha(modalSenhaValor);
          }}
        >
          <h2>Senha do administrador</h2>
          <p id="modal-senha-texto">{modalTexto}</p>
          <label htmlFor="modal-senha-campo">Senha</label>
          <input
            id="modal-senha-campo"
            type="password"
            autoComplete="new-password"
            ref={inputSenhaRef}
            value={modalSenhaValor}
            onChange={(e) => setModalSenhaValor(e.target.value)}
          />
          <div className="modal-botoes">
            <button
              className="btn"
              type="button"
              data-cancelar=""
              onClick={() => fecharModalSenha(null)}
            >
              Cancelar
            </button>
            <button className="btn prim" type="submit">
              Confirmar e salvar
            </button>
          </div>
        </form>
      </dialog>

      <datalist id="vereadores">
        {vereadores.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
  );
}
