/**
 * Extração de estado por linha de registro no próprio texto do modelo:
 * em vez de tool call ou JSON mode, o agente escreve uma linha
 * `[[REGISTRO: campo = valor]]` na resposta e o código faz parsing — funciona
 * com qualquer modelo que saiba escrever texto, sem exigir suporte a tool use
 * estruturado nem arriscar truncar JSON em streaming.
 *
 * Padrão extraído do agente-sdr/agente-whatsapp (Talles): o SOUL instrui o
 * modelo a registrar `oferta`, `etapa_spiced` etc. dessa forma, e o código
 * lê o último valor de cada campo (o mais recente vence).
 */

const REGEX_REGISTRO = /\[\[REGISTRO:\s*([a-zA-Z0-9_]+)\s*=\s*([^\]]*)\]\]/g;

export interface RegistroExtraido {
  campo: string;
  valor: string;
}

/** Extrai todas as linhas de registro, na ordem em que aparecem no texto. */
export function extrairRegistros(texto: string): RegistroExtraido[] {
  const registros: RegistroExtraido[] = [];
  for (const match of texto.matchAll(REGEX_REGISTRO)) {
    registros.push({ campo: match[1], valor: match[2].trim() });
  }
  return registros;
}

/** Remove as linhas de registro do texto — útil pra não mandar isso pro lead. */
export function removerRegistros(texto: string): string {
  return texto.replace(REGEX_REGISTRO, "").trim();
}

/**
 * Funde uma lista de registros extraídos (em ordem cronológica) num mapa de
 * estado onde, por campo, vale o valor MAIS RECENTE — mesma regra usada no
 * SDR do Talles ("entre registros vale o último").
 */
export function fundirEstado(
  estadoAtual: Record<string, string>,
  novosRegistros: RegistroExtraido[],
): Record<string, string> {
  const estado = { ...estadoAtual };
  for (const { campo, valor } of novosRegistros) {
    estado[campo] = valor;
  }
  return estado;
}
