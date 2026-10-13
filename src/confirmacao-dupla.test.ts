import { describe, expect, it } from "vitest";
import { ConfirmacaoDupla } from "./confirmacao-dupla.js";

describe("ConfirmacaoDupla", () => {
  it("não executa nada sem confirmação explícita", () => {
    const cd = new ConfirmacaoDupla();
    cd.propor("op-1", "cancelar_consulta", { consultaId: "c1" });
    expect(cd.confirmar("outro-autor")).toBeNull();
  });

  it("confirmar devolve a proposta pendente e a consome (uma vez só)", () => {
    const cd = new ConfirmacaoDupla<{ consultaId: string }>();
    cd.propor("op-1", "cancelar_consulta", { consultaId: "c1" });
    const confirmada = cd.confirmar("op-1");
    expect(confirmada?.payload.consultaId).toBe("c1");
    expect(cd.confirmar("op-1")).toBeNull(); // segunda confirmação não acha mais nada
  });

  it("expira a proposta depois do TTL", () => {
    const cd = new ConfirmacaoDupla({ ttlMs: 1000 });
    const t0 = 1_000_000;
    cd.propor("op-1", "cancelar_consulta", {}, t0);
    expect(cd.confirmar("op-1", undefined, t0 + 1500)).toBeNull();
  });

  it("recusa confirmar um tipo diferente do que foi proposto", () => {
    const cd = new ConfirmacaoDupla();
    cd.propor("op-1", "cancelar_consulta", {});
    expect(cd.confirmar("op-1", "emitir_cobranca")).toBeNull();
  });

  it("cancelar remove a proposta sem executar", () => {
    const cd = new ConfirmacaoDupla();
    cd.propor("op-1", "cancelar_consulta", {});
    cd.cancelar("op-1");
    expect(cd.confirmar("op-1")).toBeNull();
  });

  it("uma nova proposta do mesmo autor substitui a anterior", () => {
    const cd = new ConfirmacaoDupla<{ id: string }>();
    cd.propor("op-1", "cancelar_consulta", { id: "c1" });
    cd.propor("op-1", "cancelar_consulta", { id: "c2" });
    expect(cd.confirmar("op-1")?.payload.id).toBe("c2");
  });
});
