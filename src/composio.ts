/**
 * Integrações externas (Google Calendar, Drive, Trello, HubSpot...) via
 * Composio, isoladas por tenant — mesmo princípio do memory.ts: toda função
 * aqui exige `tenantId`, nunca um "global" implícito, pra tornar impossível
 * um agente de um cliente acessar (ou, pior, agir sobre) a conexão de outro.
 *
 * Mapeamento: `tenantId` deste pacote == `user_id` da Composio. Um
 * auth_config (gerenciado pela Composio, sem app OAuth próprio da GenixTech)
 * é criado uma única vez POR TOOLKIT e reaproveitado por todos os tenants —
 * é isso que mantém o onboarding "zero mão de obra" por cliente. A conexão
 * em si (quem autorizou o quê) é sempre por tenant.
 *
 * Origem: validado em produção com a Amélia (GenixTech/Felice) em 15/10 —
 * ver `agent-onboarding` para a tela de onboarding que gera esses links.
 */

const BASE_V3 = "https://backend.composio.dev/api/v3";
const BASE_V31 = "https://backend.composio.dev/api/v3.1";

export interface AuthConfigStore {
  obter(toolkitSlug: string): Promise<string | undefined>;
  salvar(toolkitSlug: string, authConfigId: string): Promise<void>;
}

/** Implementação em memória do processo — trocar por Postgres em produção. */
export class AuthConfigsEmProcesso implements AuthConfigStore {
  private readonly dados = new Map<string, string>();
  async obter(toolkitSlug: string): Promise<string | undefined> {
    return this.dados.get(toolkitSlug);
  }
  async salvar(toolkitSlug: string, authConfigId: string): Promise<void> {
    this.dados.set(toolkitSlug, authConfigId);
  }
}

export interface ConnectLink {
  toolkit: string;
  connectedAccountId: string;
  redirectUrl: string;
}

export interface ConexaoTenant {
  toolkit: string;
  status: string;
  connectedAccountId: string;
}

export interface ResultadoFerramenta {
  successful: boolean;
  data?: unknown;
  error?: string;
}

export class ComposioClient {
  constructor(
    private readonly apiKey: string = process.env.COMPOSIO_API_KEY ?? "",
    private readonly authConfigs: AuthConfigStore = new AuthConfigsEmProcesso(),
  ) {
    if (!this.apiKey) {
      throw new Error("COMPOSIO_API_KEY ausente — passe no construtor ou defina a variável de ambiente.");
    }
  }

  private headers() {
    return { "x-api-key": this.apiKey, "Content-Type": "application/json" };
  }

  /** Um auth_config por toolkit, criado uma única vez, reaproveitado por todo tenant. */
  private async authConfigPara(toolkitSlug: string): Promise<string> {
    const existente = await this.authConfigs.obter(toolkitSlug);
    if (existente) return existente;

    const res = await fetch(`${BASE_V3}/auth_configs`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        toolkit: { slug: toolkitSlug.toUpperCase() },
        auth_config: { type: "use_composio_managed_auth" },
      }),
    });
    if (!res.ok) {
      throw new Error(`Falha ao criar auth_config para ${toolkitSlug}: ${res.status} ${await res.text()}`);
    }
    const dados = (await res.json()) as { auth_config?: { id?: string } };
    const id = dados?.auth_config?.id;
    if (!id) throw new Error(`Resposta sem auth_config.id para ${toolkitSlug}: ${JSON.stringify(dados)}`);

    await this.authConfigs.salvar(toolkitSlug, id);
    return id;
  }

  /** Gera o link de autorização de um toolkit, isolado pro `tenantId` dado. */
  async gerarLinkConexao(tenantId: string, toolkitSlug: string): Promise<ConnectLink> {
    if (!tenantId) throw new Error("tenantId é obrigatório");
    const authConfigId = await this.authConfigPara(toolkitSlug);

    const res = await fetch(`${BASE_V31}/connected_accounts/link`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ auth_config_id: authConfigId, user_id: tenantId }),
    });
    if (!res.ok) {
      throw new Error(`Falha ao gerar link de ${toolkitSlug} para ${tenantId}: ${res.status} ${await res.text()}`);
    }
    const dados = (await res.json()) as { connected_account_id: string; redirect_url: string };
    return {
      toolkit: toolkitSlug,
      connectedAccountId: dados.connected_account_id,
      redirectUrl: dados.redirect_url,
    };
  }

  /** Lista as conexões (ativas ou não) desse tenant — nunca de outro. */
  async listarConexoes(tenantId: string): Promise<ConexaoTenant[]> {
    if (!tenantId) throw new Error("tenantId é obrigatório");
    const url = new URL(`${BASE_V3}/connected_accounts`);
    url.searchParams.set("user_ids", tenantId);

    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Falha ao listar conexões de ${tenantId}: ${res.status} ${await res.text()}`);
    }
    const dados = (await res.json()) as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
    const items: Array<Record<string, unknown>> = Array.isArray(dados) ? dados : (dados?.items ?? []);
    return items.map((item) => ({
      toolkit: String((item.toolkit as Record<string, unknown> | undefined)?.slug ?? item.toolkit ?? ""),
      status: String(item.status ?? ""),
      connectedAccountId: String(item.id ?? item.connected_account_id ?? ""),
    }));
  }

  /**
   * Executa uma ferramenta (ex: "GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS")
   * usando a conexão do `tenantId` dado — nunca a de outro tenant, mesmo que
   * ambos tenham o mesmo toolkit conectado.
   *
   * Endpoint confirmado contra a referência oficial da Composio (v3.1,
   * `POST /tools/execute/{slug}`); o formato exato do corpo (`user_id` +
   * `arguments`) foi cruzado com um exemplo de terceiros — revalide contra
   * a doc ao vivo antes de depender disso pesadamente em produção.
   */
  async executarFerramenta(
    tenantId: string,
    toolSlug: string,
    argumentos: Record<string, unknown> = {},
  ): Promise<ResultadoFerramenta> {
    if (!tenantId) throw new Error("tenantId é obrigatório");

    const res = await fetch(`${BASE_V31}/tools/execute/${toolSlug}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ user_id: tenantId, arguments: argumentos }),
    });
    if (!res.ok) {
      return { successful: false, error: `${res.status} ${await res.text()}` };
    }
    const dados = (await res.json()) as { successful?: boolean; data?: unknown; error?: string };
    return {
      successful: dados.successful ?? true,
      data: dados.data,
      error: dados.error ?? undefined,
    };
  }
}
