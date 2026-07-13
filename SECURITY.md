# Segurança

## Recursos implementados

- Sessão assinada com HMAC e validade de oito horas.
- Cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Senhas comparadas com `scrypt` e `timingSafeEqual`.
- Autorização por papel e por `client_id` em todas as mutações do painel.
- Validação de origem para requisições autenticadas que alteram estado.
- Rate limit em login e criação de leads demonstrativos.
- Validação de entrada com Zod.
- Assinatura HMAC do webhook Meta.
- Criptografia AES-256-GCM para tokens Meta armazenados.
- Mensagens de erro genéricas e logs estruturados sem credenciais.

## Configuração obrigatória em produção

- `SESSION_SECRET` aleatório com no mínimo 32 caracteres.
- `AUTH_USERS_JSON` com hashes `scrypt`; não use as contas públicas da demo.
- `META_TOKEN_ENCRYPTION_KEY` aleatória e armazenada fora do repositório.
- Rate limit distribuído no edge ou Redis.
- PostgreSQL gerenciado com backup e migrations versionadas.
- Provedor de e-mail e tokens de uso único para recuperação de senha.
- CSP baseada em nonce, validada no ambiente final.

## Relato responsável

Não abra uma issue pública contendo credenciais ou dados pessoais. Descreva apenas o impacto e uma forma segura de contato com o mantenedor.
