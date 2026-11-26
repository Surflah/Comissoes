export type SlotParecer = 'exec_contabil' | 'exec_juridico' | 'leg_contabil' | 'leg_juridico';

export type AbaLista = 'comissoes' | 'encerrados' | 'retirados';

export interface ParecerItem {
  nome: string;
  numero: string;
  data: string;
  url: string;
  autor?: string;
}

export interface PareceresGroup {
  exec_contabil: ParecerItem[];
  exec_juridico: ParecerItem[];
  leg_contabil: ParecerItem[];
  leg_juridico: ParecerItem[];
}

export interface HistoricoStep {
  data: string;
  status: number;
  descricao: string;
  destino: string;
  texto: string;
}

export interface NotaJuridico {
  materia_id: number;
  situacao: string;
  relator: string;
  observacoes: string;
  exec_contabil: string;
  exec_juridico: string;
  leg_contabil: string;
  leg_juridico: string;
  lista_manual: '' | AbaLista;
  editado_por: string;
  editado_em: string;
}

export interface LinhaMateria {
  id: number;
  sigla: string;
  numero: number;
  ano: number;
  titulo: string;
  ementa: string;
  autores: string;
  executivo: boolean;
  relator: string;
  entrada: string;
  apresentacao: string;
  regime: string;
  url: string;
  pdf: string;
  pareceres: PareceresGroup;
  outros_pareceres: ParecerItem[];
  ultima: HistoricoStep | null;
  situacao_sapl: string;
  resultado: string;
  historico: HistoricoStep[];
  lista: AbaLista;
  lista_sapl: 'comissoes' | 'encerrados';
  nota: NotaJuridico | null;
  data_ultima_atualizacao?: string;
}

export interface UltimaSync {
  em: string;
  materias: number;
  atualizadas: number;
  erros: number;
  segundos: number;
}

export interface DadosPayload {
  linhas: LinhaMateria[];
  ultima: UltimaSync | null;
  hoje: string;
  csrf: string;
  vereadores: string[];
}
