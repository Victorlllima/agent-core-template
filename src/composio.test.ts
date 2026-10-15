import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthConfigsEmProcesso, ComposioClient } from "./composio.js";

function respostaJson(corpo: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => corpo, text: async () => JSON.stringify(corpo) } as Response;
}

describe("ComposioClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exige tenantId pra gerar link de conexão", async () => {
    const client = new ComposioClient("chave-teste");
    await expect(client.gerarLinkConexao("", "googlecalendar")).rejects.toThrow("tenantId é obrigatório");
  });

  it("cria o auth_config uma vez e reaproveita entre tenants diferentes", async () => {
    fetchMock
      .mockResolvedValueOnce(respostaJson({ auth_config: { id: "ac_abc" } })) // cria auth_config
      .mockResolvedValueOnce(respostaJson({ connected_account_id: "ca_1", redirect_url: "https://link/1" })) // tenant A
      .mockResolvedValueOnce(respostaJson({ connected_account_id: "ca_2", redirect_url: "https://link/2" })); // tenant B

    const client = new ComposioClient("chave-teste", new AuthConfigsEmProcesso());

    const linkA = await client.gerarLinkConexao("tenant-a", "googlecalendar");
    const linkB = await client.gerarLinkConexao("tenant-b", "googlecalendar");

    expect(linkA.redirectUrl).toBe("https://link/1");
    expect(linkB.redirectUrl).toBe("https://link/2");
    // 1 chamada pra criar o auth_config + 2 chamadas de link — nunca recria o auth_config.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("isola a execução de ferramenta por tenantId — nunca chama em nome de outro", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({ successful: true, data: { ok: true } }));

    const client = new ComposioClient("chave-teste");
    await client.executarFerramenta("tenant-a", "GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS", { foo: "bar" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const corpo = JSON.parse(init.body as string);
    expect(corpo.user_id).toBe("tenant-a");
    expect(corpo.arguments).toEqual({ foo: "bar" });
  });

  it("exige tenantId pra executar ferramenta", async () => {
    const client = new ComposioClient("chave-teste");
    await expect(client.executarFerramenta("", "QUALQUER_SLUG")).rejects.toThrow("tenantId é obrigatório");
  });

  it("propaga erro da API com status e corpo", async () => {
    fetchMock.mockResolvedValueOnce(respostaJson({ message: "chave inválida" }, false, 401));
    const client = new ComposioClient("chave-teste");
    await expect(client.executarFerramenta("tenant-a", "X")).resolves.toMatchObject({ successful: false });
  });
});
