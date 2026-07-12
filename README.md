# PulseCamp AI

SaaS para gestores de tráfego acompanharem campanhas Click-to-WhatsApp, qualificarem conversas com IA e enviarem sinais de qualidade de volta para a Meta.

![Dashboard do PulseCamp AI](output/playwright/dashboard-current-desktop.png)

## Visão geral

O PulseCamp conecta mídia paga, WhatsApp e operação comercial em um único fluxo. A aplicação captura a origem do clique, acompanha o lead durante a conversa, calcula um score de qualificação e registra os eventos de conversão com rastreabilidade.

O projeto inclui um ambiente de demonstração completo. Sem chaves externas, é possível simular a jornada de um lead e avaliar o produto localmente.

## Principais recursos

- Dashboard com investimento, leads, vendas, receita, ROAS e alertas operacionais.
- Gestão multiempresa com configuração individual de qualificação e integrações.
- Captura de `ctwa_clid`, UTMs, `fbclid`, campanha e origem do clique.
- Qualificação de conversas com saída estruturada por IA e fallback determinístico.
- Pipeline comercial com etapas configuráveis e registro de vendas.
- Eventos Meta CAPI para `Contact`, `LeadSubmitted`, `Schedule`, `InitiateCheckout` e `Purchase`.
- IDs estáveis para evitar conversões duplicadas.
- Auditoria de payloads, respostas, tentativas e reprocessamentos.
- Tokens Meta criptografados com AES-256-GCM.
- Experiência responsiva para desktop e dispositivos móveis.

## Fluxo da aplicação

```text
Anúncio Click-to-WhatsApp
        ↓
Webhook da WhatsApp Cloud API
        ↓
Identificação da campanha e do lead
        ↓
Qualificação da conversa por IA
        ↓
Pipeline comercial e venda
        ↓
Feedback de conversão para a Meta CAPI
```

## Stack

- Next.js 16 e React 19
- TypeScript
- OpenAI API com saída estruturada
- Zod para validação
- WhatsApp Cloud API
- Meta Conversions API
- SQLite com camada de acesso preparada para evolução
- Node.js Test Runner

## Decisões técnicas

- **Modo seguro por padrão:** `META_CAPI_DRY_RUN=true` evita disparos reais durante a demonstração.
- **Funcionamento sem credenciais:** o classificador determinístico mantém o fluxo testável sem uma chave da OpenAI.
- **Deduplicação:** cada evento recebe um `event_id` estável.
- **Proteção de dados:** telefones são normalizados e transformados com SHA-256 antes do envio.
- **Segredos por cliente:** tokens podem vir de variáveis de ambiente ou ser armazenados de forma criptografada.
- **Rastreabilidade:** toda tentativa de integração fica disponível para auditoria e reprocessamento.

## Executar localmente

Requisitos: Node.js 24 ou superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000` e selecione **Simular lead** para percorrer o fluxo completo.

## Verificação

```bash
npm run typecheck
npm test
npm run build
```

## Rotas principais

| Método | Rota | Responsabilidade |
| --- | --- | --- |
| `GET` | `/api/health` | Saúde da aplicação e estado das integrações |
| `POST` | `/api/demo/lead` | Simulação end-to-end de um lead |
| `GET/POST` | `/api/webhooks/whatsapp` | Verificação e recebimento do webhook |
| `POST` | `/api/leads/:id/qualify` | Qualificação manual e feedback para a Meta |
| `POST` | `/api/leads/:id/stage` | Atualização da etapa do funil |
| `POST` | `/api/sales` | Registro de venda e evento `Purchase` |
| `POST` | `/api/meta/connections` | Configuração segura de ativos Meta |
| `POST` | `/api/events/:id/retry` | Reprocessamento auditável de eventos |

## Screenshots

### Gestão de empresas

![Cadastro de empresa no PulseCamp](output/playwright/company-onboarding-desktop.png)

### Integrações e rastreamento

![Integrações do PulseCamp](output/playwright/audit-integrations-desktop.png)

## Status

MVP funcional voltado a demonstração técnica e evolução de produto. Para uma operação multiempresa em produção, os próximos passos são autenticação, autorização por organização, Postgres e um gerenciador dedicado de segredos.

---

Desenvolvido por [Cauã Petry](https://github.com/cauapetrytri-rgb).
