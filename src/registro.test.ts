import { describe, expect, it } from "vitest";
import { extrairRegistros, fundirEstado, removerRegistros } from "./registro.js";

describe("registro", () => {
  it("extrai um registro simples", () => {
    const registros = extrairRegistros("Beleza! [[REGISTRO: oferta = instalador]] Vou te explicar.");
    expect(registros).toEqual([{ campo: "oferta", valor: "instalador" }]);
  });

  it("extrai múltiplos registros na ordem em que aparecem", () => {
    const texto = "[[REGISTRO: etapa = situacao]] oi [[REGISTRO: etapa = dor]]";
    expect(extrairRegistros(texto).map((r) => r.valor)).toEqual(["situacao", "dor"]);
  });

  it("remove as linhas de registro do texto final", () => {
    const texto = "Oi! [[REGISTRO: oferta = instalador]] Tudo bem?";
    const limpo = removerRegistros(texto);
    expect(limpo).not.toContain("[[REGISTRO");
    expect(limpo).toBe("Oi!  Tudo bem?");
  });

  it("funde estado mantendo o valor mais recente por campo", () => {
    const estado = fundirEstado({}, [
      { campo: "etapa", valor: "situacao" },
      { campo: "etapa", valor: "dor" },
      { campo: "oferta", valor: "instalador" },
    ]);
    expect(estado).toEqual({ etapa: "dor", oferta: "instalador" });
  });

  it("preserva estado anterior que não foi mencionado nos novos registros", () => {
    const estado = fundirEstado({ oferta: "instalador" }, [{ campo: "etapa", valor: "fechamento" }]);
    expect(estado).toEqual({ oferta: "instalador", etapa: "fechamento" });
  });
});
