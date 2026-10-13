/**
 * Interface de memória de sessão multi-tenant: a chave lógica é sempre
 * (tenantId, conversaId), nunca só conversaId — pra tornar impossível um
 * agente de um cliente ler o histórico de outro por engano.
 *
 * Padrão extraído da Sofia (GenixMed): toda query de memória carrega
 * `clinica_id`; nenhum handler consulta sessão sem ele.
 */

import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export interface ChaveSessao {
  tenantId: string;
  conversaId: string;
}

export interface SessionStore {
  carregar(chave: ChaveSessao): Promise<MessageParam[]>;
  salvar(chave: ChaveSessao, mensagens: MessageParam[]): Promise<void>;
  limpar(chave: ChaveSessao): Promise<void>;
}

/**
 * Implementação em memória do processo — serve pra desenvolvimento e testes.
 * Em produção, troque por uma implementação sobre Postgres/Supabase que
 * persista por `(tenant_id, conversa_id)`, como a Sofia faz.
 */
export class MemoriaEmProcesso implements SessionStore {
  private readonly dados = new Map<string, MessageParam[]>();

  private chaveTexto({ tenantId, conversaId }: ChaveSessao): string {
    return `${tenantId}:${conversaId}`;
  }

  async carregar(chave: ChaveSessao): Promise<MessageParam[]> {
    return this.dados.get(this.chaveTexto(chave)) ?? [];
  }

  async salvar(chave: ChaveSessao, mensagens: MessageParam[]): Promise<void> {
    this.dados.set(this.chaveTexto(chave), mensagens);
  }

  async limpar(chave: ChaveSessao): Promise<void> {
    this.dados.delete(this.chaveTexto(chave));
  }
}
