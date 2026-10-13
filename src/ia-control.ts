/**
 * Suspensão automática da IA: quando o humano responde manualmente a um
 * lead (pelo painel/Chatwoot/WhatsApp Web), o agente fica mudo até um
 * comando explícito reativar — evita a IA atropelar uma intervenção humana
 * em andamento.
 *
 * Padrão extraído do Bioete (ia-control.ts): qualquer mensagem manual do
 * operador suspende a IA pra aquela conversa; comando "/IA" reativa.
 */

export interface IaControlOptions {
  /** Comando que reativa a IA. Padrão: "/IA" (case-insensitive). */
  comandoReativar?: string;
  /**
   * Depois de quanto tempo sem atividade humana a IA volta sozinha (ms).
   * `undefined` = nunca reativa sozinha, só por comando explícito.
   */
  reativarAposMs?: number;
}

interface Suspensao {
  suspensaEm: number;
}

export class IaControl {
  private readonly comandoReativar: string;
  private readonly reativarAposMs?: number;
  private readonly suspensas = new Map<string, Suspensao>();

  constructor(opts: IaControlOptions = {}) {
    this.comandoReativar = (opts.comandoReativar ?? "/IA").toLowerCase();
    this.reativarAposMs = opts.reativarAposMs;
  }

  /** Chame quando o humano manda uma mensagem manual pro lead. */
  suspenderPorIntervencaoHumana(conversaId: string, agora = Date.now()): void {
    this.suspensas.set(conversaId, { suspensaEm: agora });
  }

  /** Chame pra cada mensagem do humano, inclusive comandos. Retorna true se reativou. */
  processarComando(conversaId: string, texto: string): boolean {
    if (texto.trim().toLowerCase() === this.comandoReativar) {
      this.suspensas.delete(conversaId);
      return true;
    }
    return false;
  }

  /** Chame antes de deixar o agente responder. */
  estaSuspensa(conversaId: string, agora = Date.now()): boolean {
    const suspensao = this.suspensas.get(conversaId);
    if (!suspensao) return false;
    if (this.reativarAposMs !== undefined && agora - suspensao.suspensaEm >= this.reativarAposMs) {
      this.suspensas.delete(conversaId);
      return false;
    }
    return true;
  }

  reativarManualmente(conversaId: string): void {
    this.suspensas.delete(conversaId);
  }
}
