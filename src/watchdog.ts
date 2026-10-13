/**
 * Watchdog de entrega/conexão: detecta quando o canal (WhatsApp) está "vivo"
 * mas não está entregando de verdade — diferente de um healthcheck comum,
 * que só vê se o processo está de pé.
 *
 * Dois casos distintos, ambos extraídos de incidentes reais:
 *  - Fila travada (Sofia/GenixMed): o provedor recebe mas não entrega; nasceu
 *    de um incidente de 44h sem entrega que os healthchecks não cobriam.
 *    Decide com evidência estatística mínima (N envios maduros sem confirmar)
 *    pra não alarmar por causa de UM paciente com o celular desligado.
 *  - Desconexão silenciosa (Bioete): o status da instância diz "open" mas o
 *    envio falha mesmo assim — precisa testar o envio, não só o status.
 */

export interface EnvioPendente {
  id: string;
  enviadoEm: number;
  confirmadoEm: number | null;
}

export interface FilaTravadaOptions {
  /** Quanto tempo um envio precisa esperar pra contar como "maduro" (ms). Padrão: 10 min. */
  maturidadeMs?: number;
  /** Quantos envios maduros sem confirmação, no mínimo, pra considerar travado. Padrão: 3. */
  minimoParaAlarmar?: number;
}

const DEFAULTS: Required<FilaTravadaOptions> = {
  maturidadeMs: 10 * 60 * 1000,
  minimoParaAlarmar: 3,
};

/**
 * Lógica pura: recebe a lista de envios recentes e "agora", devolve se deve
 * alarmar. Não toca banco nem dispara alerta — isso fica por conta de quem
 * chama, que lê do seu próprio histórico de entregas.
 */
export function filaEstaTravada(envios: EnvioPendente[], agora: number, opts: FilaTravadaOptions = {}): boolean {
  const { maturidadeMs, minimoParaAlarmar } = { ...DEFAULTS, ...opts };
  const maduro = envios.filter((e) => agora - e.enviadoEm >= maturidadeMs);
  const semConfirmar = maduro.filter((e) => e.confirmadoEm === null);
  return semConfirmar.length >= minimoParaAlarmar && semConfirmar.length === maduro.length;
}

export interface TesteDeConexao {
  /** true se o status reportado pelo provedor diz "conectado". */
  statusAberto: boolean;
  /** true se um envio de teste de verdade saiu (não só o status). */
  envioFuncionou: boolean;
}

export type DiagnosticoConexao = "conectado" | "desconectado" | "desconexao_silenciosa";

/** Combina status + teste de envio real pra distinguir os três estados. */
export function diagnosticarConexao({ statusAberto, envioFuncionou }: TesteDeConexao): DiagnosticoConexao {
  if (!statusAberto) return "desconectado";
  if (!envioFuncionou) return "desconexao_silenciosa";
  return "conectado";
}
