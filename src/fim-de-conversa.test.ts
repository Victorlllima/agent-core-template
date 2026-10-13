import { describe, expect, it } from "vitest";
import { deveFicarEmSilencio } from "./fim-de-conversa.js";

describe("deveFicarEmSilencio", () => {
  it("fica em silêncio com confirmação social depois do encerramento", () => {
    expect(deveFicarEmSilencio(true, "Ok, obrigado!")).toBe(false); // frase composta não é "só" confirmação curta
    expect(deveFicarEmSilencio(true, "obrigado")).toBe(true);
    expect(deveFicarEmSilencio(true, "👍")).toBe(true);
    expect(deveFicarEmSilencio(true, "blz")).toBe(true);
  });

  it("não fica em silêncio se a conversa não está encerrada", () => {
    expect(deveFicarEmSilencio(false, "ok")).toBe(false);
  });

  it("não fica em silêncio pra mensagem longa ou com assunto novo", () => {
    expect(deveFicarEmSilencio(true, "ok, mas ainda tenho uma dúvida sobre o preço")).toBe(false);
    expect(deveFicarEmSilencio(true, "e sobre o horário de amanhã?")).toBe(false);
  });

  it("aceita lista customizada de confirmações sociais", () => {
    expect(deveFicarEmSilencio(true, "fechou", { confirmacoesSociais: ["fechou"] })).toBe(true);
    expect(deveFicarEmSilencio(true, "obrigado", { confirmacoesSociais: ["fechou"] })).toBe(false);
  });
});
