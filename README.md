# @genixtech/agent-core

Guardrails reutilizáveis para agentes de atendimento/vendas via WhatsApp da GenixTech.
Base dos templates [`agent-sdr-template`](https://github.com/Victorlllima/agent-sdr-template) e
[`agent-suporte-template`](https://github.com/Victorlllima/agent-suporte-template).

Cada módulo aqui nasceu de um padrão observado em pelo menos um agente real já em produção —
não é teoria. As fontes:

- **Sofia** (GenixMed — recepção/qualificação de leads de clínica): confirmação em duas etapas,
  watchdog de fila, trava de fim-de-conversa, memória multi-tenant, prompt caching.
- **Bioete** (Grupo MPF — SDR comercial + assistente interno "Bia2"): suspensão da IA por
  intervenção humana, debounce de rajada, follow-up multi-trilha.
- **agente-sdr / agente-whatsapp** (referência externa, Talles — Evolution + bridge + Chatwoot +
  Hermes + "brain" revisor): registro de estado por linha de texto (`[[REGISTRO: campo=valor]]`),
  guardrail determinístico em código sobre o que o modelo decidiu.

## Por que isso existe

Nos três sistemas analisados, os guardrails de qualidade e segurança vêm de **regras
determinísticas antes ou depois da chamada ao modelo** — não de instruir melhor o prompt. Um
modelo pode ser convencido a ignorar uma instrução; uma função TypeScript que roda antes dele ser
chamado, não. Esse pacote é a coleção dessas funções.

## Módulos

| Módulo | O que resolve | Nasceu de |
|---|---|---|
| `anti-loop` | Dedupe de mensagem duplicada (retry do provedor) + rate limit por telefone | Sofia |
| `confirmacao-dupla` | Nenhuma ação de escrita (cancelar, cobrar, apagar) executa sem confirmação humana num turno separado | Sofia ("Genix" admin) |
| `debounce` | Junta mensagens em rajada numa só antes de chamar o modelo | Bioete (Bia2) |
| `watchdog` | Detecta canal "vivo mas não entregando" (fila travada) e desconexão silenciosa (status ok, envio falha) | Sofia + Bioete |
| `fim-de-conversa` | Não reabre conversa encerrada por causa de "ok"/"👍" | Sofia |
| `ia-control` | Suspende a IA quando o humano intervém manualmente; só comando explícito reativa | Bioete |
| `prompt-cache` | Separa system prompt fixo (cacheável) de variável (data, nome) | Sofia |
| `registro` | Extrai estado estruturado de linhas `[[REGISTRO: campo=valor]]` no texto do modelo | agente-sdr (Talles) |
| `memory` | Interface de sessão com chave `(tenantId, conversaId)` — nunca só conversaId | Sofia |

## Uso

```bash
npm install github:Victorlllima/agent-core-template
```

```ts
import { AntiLoop, ConfirmacaoDupla, deveFicarEmSilencio } from "@genixtech/agent-core";
```

Cada módulo também é importável isolado (`@genixtech/agent-core/anti-loop`) se você só quer um
pedaço.

## Desenvolvimento

```bash
npm install
npm test        # vitest run
npm run build    # compila pra dist/
```

## O que NÃO está aqui (de propósito)

Lógica de negócio (ofertas, preços, roteiro de qualificação, personas) é específica de cada
cliente/projeto — fica nos templates `agent-sdr-template` e `agent-suporte-template`, não aqui.
Este pacote só tem o que é genuinamente reaproveitável entre qualquer agente que a GenixTech
construa.
