/**
 * Helper de prompt caching do Anthropic SDK: separa o system prompt num
 * bloco FIXO (marcado com cache_control) e um bloco VARIÁVEL (data, nome do
 * contato, estado da conversa) que fica de fora do cache — pra não invalidar
 * o cache a cada mensagem só porque a data mudou.
 *
 * Padrão extraído da Sofia (GenixMed).
 */

import type { MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";

export interface SystemCacheado {
  /** Texto que NÃO muda entre turnos da mesma conversa/tenant (persona, regras). */
  fixo: string;
  /** Texto que muda a cada turno (data/hora, nome do contato, resumo de estado). */
  variavel?: string;
}

/**
 * Monta o array `system` pro Messages API com o bloco fixo marcado como
 * `cache_control: { type: "ephemeral" }` e o variável sem cache, nessa ordem
 * — o cache só vale pro prefixo, então o bloco fixo tem que vir primeiro.
 */
export function montarSystemCacheado({ fixo, variavel }: SystemCacheado): TextBlockParam[] {
  const blocos: TextBlockParam[] = [
    { type: "text", text: fixo, cache_control: { type: "ephemeral" } },
  ];
  if (variavel) {
    blocos.push({ type: "text", text: variavel });
  }
  return blocos;
}

/**
 * Lembrete de uso: mantenha `fixo` byte-a-byte idêntico entre chamadas da
 * mesma persona/tenant (mesmo texto, mesma ordem) — qualquer diferença
 * invalida o cache a partir daquele ponto. Verifique
 * `response.usage.cache_read_input_tokens` > 0 pra confirmar que está
 * funcionando; se ficar sempre zero, algo no bloco fixo está variando.
 */
export type { MessageParam };
