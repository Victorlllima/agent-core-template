/**
 * Confirmação em duas etapas: nenhuma ação administrativa de escrita (cancelar
 * consulta, emitir cobrança, apagar algo) roda no mesmo turno em que o modelo
 * decide fazê-la. O modelo PROPÕE, grava a intenção, e só EXECUTA quando o
 * humano confirma num turno separado — com expiração, para a proposta não
 * ficar pendurada indefinidamente.
 *
 * Padrão extraído do agente "Genix" da Sofia (GenixMed): braço administrativo
 * do gestor da clínica, onde qualquer ação de escrita passa por
 * propor_acao -> confirmar_acao.
 */

export interface AcaoProposta<TPayload = unknown> {
  id: string;
  autor: string; // telefone/identificador de quem propôs a execução
  tipo: string; // nome da ação, ex: "cancelar_consulta"
  payload: TPayload;
  criadaEm: number;
  expiraEm: number;
}

export interface ConfirmacaoDuplaOptions {
  /** Quanto tempo uma proposta fica válida antes de expirar (ms). Padrão: 5 min. */
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class ConfirmacaoDupla<TPayload = unknown> {
  private readonly ttlMs: number;
  private readonly pendentes = new Map<string, AcaoProposta<TPayload>>();

  constructor(opts: ConfirmacaoDuplaOptions = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  }

  /** O modelo chama isso em vez de executar a ação direto. */
  propor(autor: string, tipo: string, payload: TPayload, agora = Date.now()): AcaoProposta<TPayload> {
    const id = `${autor}:${tipo}:${agora}`;
    const proposta: AcaoProposta<TPayload> = {
      id,
      autor,
      tipo,
      payload,
      criadaEm: agora,
      expiraEm: agora + this.ttlMs,
    };
    this.pendentes.set(autor, proposta);
    return proposta;
  }

  /**
   * O modelo chama isso quando o humano confirma ("sim", "pode", "confirma").
   * Retorna a proposta pendente (pronta pra executar) ou null se não houver
   * nenhuma, se expirou, ou se o tipo não bate com o que foi pedido.
   */
  confirmar(autor: string, tipoEsperado?: string, agora = Date.now()): AcaoProposta<TPayload> | null {
    const proposta = this.pendentes.get(autor);
    if (!proposta) return null;
    if (proposta.expiraEm <= agora) {
      this.pendentes.delete(autor);
      return null;
    }
    if (tipoEsperado && proposta.tipo !== tipoEsperado) return null;
    this.pendentes.delete(autor); // consome — uma confirmação, uma execução
    return proposta;
  }

  /** O modelo chama isso se o humano recusar ou mudar de ideia. */
  cancelar(autor: string): void {
    this.pendentes.delete(autor);
  }

  pendente(autor: string, agora = Date.now()): AcaoProposta<TPayload> | null {
    const proposta = this.pendentes.get(autor);
    if (!proposta || proposta.expiraEm <= agora) return null;
    return proposta;
  }
}
