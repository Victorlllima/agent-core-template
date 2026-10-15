import { describe, expect, it } from "vitest";
import { TenantToolkitsEmProcesso } from "./tenant-toolkits.js";

describe("TenantToolkitsEmProcesso", () => {
  it("começa sem nenhum toolkit habilitado", async () => {
    const store = new TenantToolkitsEmProcesso();
    expect(await store.listarHabilitados("tenant-a")).toEqual([]);
  });

  it("habilita e lista toolkits de um tenant", async () => {
    const store = new TenantToolkitsEmProcesso();
    await store.habilitar("tenant-a", "googlecalendar");
    await store.habilitar("tenant-a", "trello");
    expect(await store.listarHabilitados("tenant-a")).toEqual(["googlecalendar", "trello"]);
  });

  it("isola tenants diferentes — habilitar num não vaza pro outro", async () => {
    const store = new TenantToolkitsEmProcesso();
    await store.habilitar("tenant-a", "googlecalendar");
    expect(await store.listarHabilitados("tenant-b")).toEqual([]);
  });

  it("desabilita um toolkit específico sem afetar os outros", async () => {
    const store = new TenantToolkitsEmProcesso();
    await store.habilitar("tenant-a", "googlecalendar");
    await store.habilitar("tenant-a", "trello");
    await store.desabilitar("tenant-a", "googlecalendar");
    expect(await store.listarHabilitados("tenant-a")).toEqual(["trello"]);
  });
});
