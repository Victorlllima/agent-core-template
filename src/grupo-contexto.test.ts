import { describe, expect, it } from "vitest";
import { ContextoGrupo, deveResponder } from "./grupo-contexto.js";

const G = { tenantId: "t1", grupoId: "123@g.us" };
const hora = (ts: number) => String(ts);

describe("deveResponder", () => {
  it("ignora mensagem que não chama o agente", () => {
    expect(deveResponder({ texto: "mãe, pegou a certidão?", padroes: [/\bElvis\b/i] })).toBe(false);
  });
  it("aceita nome, @menção, resposta ao agente e comando", () => {
    expect(deveResponder({ texto: "elvis, o que falta?", padroes: ["Elvis"] })).toBe(true);
    expect(deveResponder({ texto: "oi", mencionados: ["bot@lid"], idsAgente: ["bot@lid"] })).toBe(true);
    expect(deveResponder({ texto: "isso", respondendoAoAgente: true })).toBe(true);
    expect(deveResponder({ texto: "/status" })).toBe(true);
  });
  it("não confunde nome dentro de outra palavra", () => {
    expect(deveResponder({ texto: "elvisão chegou", padroes: ["Elvis"] })).toBe(false);
  });
});

describe("ContextoGrupo", () => {
  it("entrega tudo desde a última leitura, inclusive as respostas do agente", async () => {
    const c = new ContextoGrupo();
    await c.registrar(G, { autor: "Mari", texto: "Mãe, pegou a certidão?", ts: 10 });
    await c.registrar(G, { autor: "Sonia", texto: "Peguei ontem", ts: 20 });
    await c.registrar(G, { autor: "Elvis", texto: "Anotado.", ts: 30, doAgente: true });
    await c.registrar(G, { autor: "Pedro", texto: "Elvis, o que falta?", ts: 40 });
    const l = await c.lerDesdeUltimaLeitura(G, { agora: 50, janelaInicialMs: 100, formatarHora: hora });
    expect(l.mensagens).toHaveLength(4);
    expect(l.contexto).toContain("[20] Sonia: Peguei ontem");
    expect(l.contexto).toContain("[30] Você (o agente): Anotado.");
  });

  it("na leitura seguinte entrega só o que é novo (diff)", async () => {
    const c = new ContextoGrupo();
    await c.registrar(G, { autor: "Mari", texto: "a", ts: 10 });
    await c.lerDesdeUltimaLeitura(G, { agora: 15, janelaInicialMs: 100 });
    await c.registrar(G, { autor: "Pedro", texto: "b", ts: 20 });
    const l = await c.lerDesdeUltimaLeitura(G, { agora: 25 });
    expect(l.mensagens.map((m) => m.texto)).toEqual(["b"]);
    const vazio = await c.lerDesdeUltimaLeitura(G, { agora: 30 });
    expect(vazio.mensagens).toHaveLength(0);
    expect(vazio.contexto).toContain("Nada de novo");
  });

  it("isola grupos e tenants", async () => {
    const c = new ContextoGrupo();
    await c.registrar(G, { autor: "Mari", texto: "do t1", ts: 10 });
    await c.registrar({ tenantId: "t2", grupoId: G.grupoId }, { autor: "X", texto: "do t2", ts: 10 });
    const l = await c.lerDesdeUltimaLeitura(G, { agora: 20, janelaInicialMs: 100 });
    expect(l.mensagens.map((m) => m.texto)).toEqual(["do t1"]);
  });

  it("corta pelas mais recentes quando passa do limite", async () => {
    const c = new ContextoGrupo();
    for (let i = 1; i <= 5; i++) await c.registrar(G, { autor: "A", texto: `m${i}`, ts: i });
    const l = await c.lerDesdeUltimaLeitura(G, { agora: 10, janelaInicialMs: 100, maxMensagens: 2 });
    expect(l.mensagens.map((m) => m.texto)).toEqual(["m4", "m5"]);
    expect(l.omitidas).toBe(3);
    expect(l.contexto).toContain("3 mais antigas omitidas");
  });
});
