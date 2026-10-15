/**
 * Quais toolkits (Composio) cada tenant habilitou — preenchido pela tela de
 * onboarding (`agent-onboarding`) quando o cliente marca o checklist.
 * Separado de `composio.ts` de propósito: isso é preferência do cliente
 * ("quero que o agente acesse X"), não status de conexão OAuth — um toolkit
 * pode estar habilitado e ainda `EXPIRED` do lado da Composio.
 *
 * O agente usa isso pra decidir quais `tools` oferecer ao modelo por tenant:
 * nunca ofereça ao modelo uma ferramenta que o cliente não autorizou.
 */

export interface TenantToolkitStore {
  listarHabilitados(tenantId: string): Promise<string[]>;
  habilitar(tenantId: string, toolkitSlug: string): Promise<void>;
  desabilitar(tenantId: string, toolkitSlug: string): Promise<void>;
}

/** Implementação em memória do processo — trocar por Postgres em produção. */
export class TenantToolkitsEmProcesso implements TenantToolkitStore {
  private readonly dados = new Map<string, Set<string>>();

  async listarHabilitados(tenantId: string): Promise<string[]> {
    return Array.from(this.dados.get(tenantId) ?? []);
  }

  async habilitar(tenantId: string, toolkitSlug: string): Promise<void> {
    const atuais = this.dados.get(tenantId) ?? new Set<string>();
    atuais.add(toolkitSlug);
    this.dados.set(tenantId, atuais);
  }

  async desabilitar(tenantId: string, toolkitSlug: string): Promise<void> {
    this.dados.get(tenantId)?.delete(toolkitSlug);
  }
}
