/**
 * Trava determinística pré-LLM: decide, SEM chamar o modelo, quando uma
 * mensagem do lead é só confirmação social depois de a conversa já ter
 * encerrado ("Ok", "👍", "obrigado") — pra não reabrir o atendimento do zero
 * nem gastar tokens decidindo isso.
 *
 * Padrão extraído da Sofia (GenixMed), nascido de um incidente real de
 * reabertura indevida de conversa encerrada.
 */

const CONFIRMACOES_SOCIAIS = [
  "ok",
  "okay",
  "blz",
  "beleza",
  "👍",
  "obrigado",
  "obrigada",
  "vlw",
  "valeu",
  "show",
  "👌",
  "✅",
  "certo",
  "entendi",
];

export interface FimDeConversaOptions {
  /** Lista de confirmações sociais, em minúsculas. Sobrescreve a lista padrão. */
  confirmacoesSociais?: string[];
  /** Tamanho máximo (em caracteres) pra considerar "mensagem curta". Padrão: 20. */
  tamanhoMaximo?: number;
}

/**
 * Retorna true quando a conversa está encerrada E a mensagem nova é só uma
 * confirmação social curta — ou seja, o agente deve ficar em silêncio.
 * Qualquer outra coisa (pergunta nova, assunto diferente) deve seguir pro
 * modelo normalmente.
 */
export function deveFicarEmSilencio(
  conversaEncerrada: boolean,
  textoRecebido: string,
  opts: FimDeConversaOptions = {},
): boolean {
  if (!conversaEncerrada) return false;
  const tamanhoMaximo = opts.tamanhoMaximo ?? 20;
  const lista = (opts.confirmacoesSociais ?? CONFIRMACOES_SOCIAIS).map((s) => s.toLowerCase());
  // Remove pontuação final (!, ., ,) antes de comparar, mas exige igualdade exata —
  // "startsWith" daria falso positivo em frases como "ok, mas tenho uma dúvida".
  const normalizado = textoRecebido.trim().toLowerCase().replace(/[!.,;?]+$/g, "").trim();
  if (normalizado.length === 0 || normalizado.length > tamanhoMaximo) return false;
  return lista.includes(normalizado);
}
