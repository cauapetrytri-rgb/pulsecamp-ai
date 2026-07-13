# Arquitetura e modelo de dados

## Limites de confiança

```mermaid
flowchart TB
  B[Browser] -->|credenciais| L[Login]
  L -->|cookie HttpOnly assinado| B
  B -->|Origin + sessão| R[Route Handlers]
  R --> Z[Validação Zod]
  Z --> A[RBAC e ACL por client_id]
  A --> D[(Banco)]
  M[Meta] -->|webhook HMAC| W[Webhook público]
  W --> D
  D --> C[Meta CAPI]
```

O webhook é público por necessidade de integração, mas valida token na assinatura inicial e `x-hub-signature-256` no recebimento. As rotas do painel exigem sessão e verificam a empresa antes de acessar o recurso.

## Entidades

```mermaid
erDiagram
  CLIENTS ||--o{ CAMPAIGNS : possui
  CLIENTS ||--o{ LEADS : recebe
  CLIENTS ||--o{ JOURNEY_STAGES : configura
  CLIENTS ||--o{ META_CONNECTIONS : integra
  CLIENTS ||--o{ TRACKING_SITES : monitora
  CLIENTS ||--o{ TRACKED_LINKS : cria
  LEADS ||--o{ LEAD_MESSAGES : conversa
  LEADS ||--o{ LEAD_STAGE_HISTORY : percorre
  LEADS ||--o{ META_EVENTS : gera
  LEADS ||--o{ SALES : converte
  TRACKED_LINKS ||--o{ TRACKED_LINK_CLICKS : registra
```

Todas as entidades operacionais carregam `client_id`. A autorização resolve o `client_id` do recurso no servidor; valores enviados pelo cliente não são usados como única prova de acesso.

## Persistência

O modo demonstrativo usa `node:sqlite` e cria o schema de forma idempotente. Para produção multi-instância, a evolução prevista é PostgreSQL com migrations versionadas e pool compatível com serverless. Essa mudança exige provisionar o banco e não é simulada por um adapter incompleto.

## Observabilidade

Erros inesperados são registrados como JSON com nível, contexto, mensagem e horário. Cabeçalhos, cookies, tokens e corpos de autenticação não são registrados.
