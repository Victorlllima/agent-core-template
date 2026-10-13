/**
 * Debounce de mensagens em rajada: quando o lead manda várias mensagens
 * seguidas ("oi", "tudo bem?", "queria saber sobre..."), junta tudo numa
 * única "super-mensagem" antes de chamar o modelo, em vez de responder a
 * cada fragmento (o que produz respostas fora de ordem e gasta tokens à toa).
 *
 * Padrão extraído do Bia2 (Bioete): janela de ~4s por conversa.
 */

export interface DebounceOptions {
  /** Janela de acúmulo em ms. Padrão: 4000 (4s), igual ao Bia2. */
  janelaMs?: number;
  /** Como juntar os fragmentos. Padrão: uma linha por fragmento. */
  juntar?: (fragmentos: string[]) => string;
}

const DEFAULT_JANELA_MS = 4000;
const juntarPadrao = (fragmentos: string[]) => fragmentos.join("\n");

export class DebounceConversa {
  private readonly janelaMs: number;
  private readonly juntar: (fragmentos: string[]) => string;
  private readonly pendentes = new Map<
    string,
    { fragmentos: string[]; timer: ReturnType<typeof setTimeout> }
  >();

  constructor(
    private readonly onFlush: (conversaId: string, mensagem: string) => void | Promise<void>,
    opts: DebounceOptions = {},
  ) {
    this.janelaMs = opts.janelaMs ?? DEFAULT_JANELA_MS;
    this.juntar = opts.juntar ?? juntarPadrao;
  }

  /** Chame a cada mensagem nova recebida do lead. */
  adicionar(conversaId: string, texto: string): void {
    const existente = this.pendentes.get(conversaId);
    if (existente) {
      clearTimeout(existente.timer);
      existente.fragmentos.push(texto);
      existente.timer = setTimeout(() => this.flush(conversaId), this.janelaMs);
      return;
    }
    const timer = setTimeout(() => this.flush(conversaId), this.janelaMs);
    this.pendentes.set(conversaId, { fragmentos: [texto], timer });
  }

  /** Força o flush imediato (ex.: ao encerrar o processo). */
  flush(conversaId: string): void {
    const pendente = this.pendentes.get(conversaId);
    if (!pendente) return;
    clearTimeout(pendente.timer);
    this.pendentes.delete(conversaId);
    void this.onFlush(conversaId, this.juntar(pendente.fragmentos));
  }

  /** Cancela sem disparar o flush (ex.: conversa foi pausada por handoff). */
  descartar(conversaId: string): void {
    const pendente = this.pendentes.get(conversaId);
    if (!pendente) return;
    clearTimeout(pendente.timer);
    this.pendentes.delete(conversaId);
  }
}
