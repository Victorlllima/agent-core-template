/**
 * Anti-loop / anti-flood: evita que o agente processe a mesma mensagem duas vezes
 * (retry duplicado do provedor de WhatsApp) e evita que um número alague o agente
 * de chamadas ao modelo (flood, intencional ou por bug do lado do lead).
 *
 * Padrão extraído da Sofia (GenixMed): dedupe por messageId com TTL curto +
 * rate limit por telefone numa janela deslizante.
 */

export interface AntiLoopOptions {
  /** Quanto tempo um messageId processado fica "lembrado" (ms). Padrão: 5 min. */
  dedupeTtlMs?: number;
  /** Máximo de mensagens aceitas por telefone na janela. Padrão: 30. */
  maxPerWindow?: number;
  /** Duração da janela de rate limit (ms). Padrão: 1 hora. */
  windowMs?: number;
}

export interface AntiLoopDecision {
  /** false = mensagem já vista (duplicata) ou telefone estourou o limite. */
  aceitar: boolean;
  motivo?: "duplicata" | "rate_limit";
}

const DEFAULTS: Required<AntiLoopOptions> = {
  dedupeTtlMs: 5 * 60 * 1000,
  maxPerWindow: 30,
  windowMs: 60 * 60 * 1000,
};

/**
 * Guarda estado em memória do processo. Para múltiplas réplicas do mesmo
 * agente, troque por um backend compartilhado (Redis) implementando a mesma
 * interface de `seen`/`history` — a lógica de decisão não muda.
 */
export class AntiLoop {
  private readonly opts: Required<AntiLoopOptions>;
  private readonly seen = new Map<string, number>(); // messageId -> expira em
  private readonly history = new Map<string, number[]>(); // telefone -> timestamps

  constructor(opts: AntiLoopOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  /** Chame antes de processar qualquer mensagem recebida. */
  avaliar(telefone: string, messageId: string, agora = Date.now()): AntiLoopDecision {
    this.limparExpirados(agora);

    if (this.seen.has(messageId)) {
      return { aceitar: false, motivo: "duplicata" };
    }
    this.seen.set(messageId, agora + this.opts.dedupeTtlMs);

    const janela = this.history.get(telefone) ?? [];
    const dentroDaJanela = janela.filter((t) => agora - t < this.opts.windowMs);
    if (dentroDaJanela.length >= this.opts.maxPerWindow) {
      this.history.set(telefone, dentroDaJanela);
      return { aceitar: false, motivo: "rate_limit" };
    }
    dentroDaJanela.push(agora);
    this.history.set(telefone, dentroDaJanela);
    return { aceitar: true };
  }

  private limparExpirados(agora: number) {
    for (const [id, expira] of this.seen) {
      if (expira <= agora) this.seen.delete(id);
    }
  }
}
