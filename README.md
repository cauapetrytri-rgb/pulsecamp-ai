# PulseCamp AI

MVP para gestores de tráfego rastrearem campanhas Click-to-WhatsApp, qualificarem conversas e enviarem o sinal de qualidade de volta para a Meta.

## O fluxo implementado

1. A WhatsApp Cloud API entrega a primeira mensagem ao webhook.
2. O app captura `ctwa_clid`, `source_id`, WABA e número do cliente.
3. A conversa é qualificada por IA com saída estruturada. Sem `OPENAI_API_KEY`, um classificador determinístico mantém o modo de demonstração funcional.
4. Quando o score cruza o limite do cliente, o lead vira qualificado.
5. A jornada envia `Contact`, `LeadSubmitted`, `Schedule`, `InitiateCheckout` e `Purchase` conforme a etapa configurada.
6. Vendas carregam valor e moeda, e cada evento possui ID estável para não duplicar a conversão.
7. O dashboard registra payload, tentativas, resposta e possíveis falhas.

Links com destino ao WhatsApp recebem uma referência curta na mensagem pré-preenchida. Quando a conversa chega ao webhook, essa referência liga o telefone ao clique, à campanha, às UTMs e ao `fbclid`; o identificador é removido antes da qualificação da conversa.

O evento usa:

- `action_source: business_messaging`
- `messaging_channel: whatsapp`
- `user_data.ctwa_clid`
- `user_data.whatsapp_business_account_id`
- telefone normalizado e transformado com SHA-256
- `event_id` estável para evitar duplicidade

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. O botão **Simular lead** percorre o ciclo completo e, por padrão, mantém a CAPI em modo seguro (`META_CAPI_DRY_RUN=true`).

## Rotas

- `GET /api/health` — saúde e modo das integrações.
- `GET /api/webhooks/whatsapp` — verificação do webhook Meta.
- `POST /api/webhooks/whatsapp` — mensagens da WhatsApp Cloud API.
- `POST /api/demo/lead` — simulação end-to-end.
- `POST /api/leads/:id/qualify` — qualificação manual com feedback Meta.
- `POST /api/leads/:id/stage` — move a etapa e dispara o evento configurado.
- `POST /api/sales` — registra venda e envia `Purchase` com valor.
- `POST /api/journey` — salva o mapeamento de etapas e eventos por cliente.
- `POST /api/clients` — cria uma empresa com conexão em modo de configuração e jornada padrão.
- `POST /api/clients/:id/qualification` — salva o score mínimo de qualificação da empresa.
- `POST /api/meta/connections` — salva ativos e token Meta criptografado.
- `POST /api/meta/connections/:clientId/test` — valida o conjunto de dados na Graph API.
- `POST /api/events/:id/retry` — reprocessamento auditável.

## Ativação real na Meta

1. Crie um Meta App empresarial e configure WhatsApp, Webhooks e Marketing API.
2. Passe por Business Verification, App Review e Advanced Access para atender ativos de clientes.
3. Faça o onboarding de cada cliente por Embedded Signup; nunca peça senha ou sessão por QR Code.
4. Assine o campo `messages` na WABA e configure o webhook HTTPS deste app.
5. Garanta que o dataset de mensageria do cliente esteja associado à WABA correta. Sem essa associação, eventos com `ctwa_clid` podem ser rejeitados.
6. Preencha WABA, `phone_number_id`, dataset e referência do segredo por cliente.
7. Teste primeiro com `META_TEST_EVENT_CODE` no Events Manager.
8. Somente depois altere `META_CAPI_DRY_RUN=false`.

Tokens podem apontar para uma variável de ambiente ou ser armazenados com AES-256-GCM usando `META_TOKEN_ENCRYPTION_KEY`; o valor nunca retorna para a interface. Em produção, prefira um secrets manager e troque o SQLite por Postgres mantendo a mesma camada de serviço.

O painel roda sem login para facilitar a demonstração local. Antes de publicar uma instância multiempresa, conecte um provedor de autenticação e aplique isolamento por organização nas consultas e mutações.

## Verificação

```bash
npm run typecheck
npm test
npm run build
```
