import { describe, expect, it } from "vitest";
import { AntiLoop } from "./anti-loop.js";

describe("AntiLoop", () => {
  it("aceita a primeira mensagem de um messageId", () => {
    const al = new AntiLoop();
    expect(al.avaliar("5561999999999", "msg-1").aceitar).toBe(true);
  });

  it("rejeita messageId duplicado (retry do provedor)", () => {
    const al = new AntiLoop();
    al.avaliar("5561999999999", "msg-1");
    const segunda = al.avaliar("5561999999999", "msg-1");
    expect(segunda.aceitar).toBe(false);
    expect(segunda.motivo).toBe("duplicata");
  });

  it("deixa de rejeitar depois que o TTL do dedupe expira", () => {
    const al = new AntiLoop({ dedupeTtlMs: 1000 });
    const t0 = 1_000_000;
    al.avaliar("5561999999999", "msg-1", t0);
    const antesExpirar = al.avaliar("5561999999999", "msg-1", t0 + 500);
    expect(antesExpirar.aceitar).toBe(false);
    const depoisExpirar = al.avaliar("5561999999999", "msg-2", t0 + 1500);
    expect(depoisExpirar.aceitar).toBe(true);
  });

  it("aplica rate limit por telefone, não globalmente", () => {
    const al = new AntiLoop({ maxPerWindow: 2, windowMs: 60_000 });
    const t0 = 2_000_000;
    expect(al.avaliar("A", "a1", t0).aceitar).toBe(true);
    expect(al.avaliar("A", "a2", t0).aceitar).toBe(true);
    const terceira = al.avaliar("A", "a3", t0);
    expect(terceira.aceitar).toBe(false);
    expect(terceira.motivo).toBe("rate_limit");
    // outro telefone não é afetado pelo limite do primeiro
    expect(al.avaliar("B", "b1", t0).aceitar).toBe(true);
  });

  it("libera espaço na janela conforme mensagens antigas saem dela", () => {
    const al = new AntiLoop({ maxPerWindow: 1, windowMs: 1000 });
    const t0 = 3_000_000;
    expect(al.avaliar("A", "a1", t0).aceitar).toBe(true);
    expect(al.avaliar("A", "a2", t0 + 500).aceitar).toBe(false);
    expect(al.avaliar("A", "a3", t0 + 1500).aceitar).toBe(true);
  });
});
