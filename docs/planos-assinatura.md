# Planos e assinatura (fundação)

Infraestrutura para planos **Gratuito**, **OpinioTop** (R$ 9,99/mês) e **OpinioPro** (R$ 19,99/mês). Pagamento ainda não integrado: admins atribuem planos manualmente com duração ou vitalícia.

## Migration

Execute no banco existente:

```bash
psql $DATABASE_URL -f backend/sql/migrations/20260708_planos_assinatura.sql
```

Adiciona `usuarios.assinatura_expira_em` e padroniza códigos em `assinaturas` (`gratuito`, `opiniotop`, `opiniopro`).

## Backend: checar plano

Helpers em `backend/src/modelos/plano.go`:

```go
modelos.PlanoAtivo(usuario)    // vigente? (gratuito sempre true; pago sem data = vitalício)
modelos.PlanoVitalicio(usuario) // pago sem assinatura_expira_em
modelos.TemPlanoTop(usuario)   // OpinioTop ou OpinioPro ativo
modelos.TemPlanoPro(usuario)   // só OpinioPro ativo
modelos.PlanoEfetivoID(usuario) // downgrade para gratuito se expirado
modelos.StatusPlano(usuario)   // struct JSON para API (inclui vitalicia)
```

Plano expirado: `assinatura_id` permanece no banco, mas helpers tratam como gratuito.

**Vitalícia:** plano pago com `assinatura_expira_em = NULL` nunca expira. Campo `vitalicia: true` na resposta da API.

Timestamps inválidos/zero são normalizados para `null` via `modelos.PtrTempoJSON` (evita crash no JSON).

## API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/planos` | - | Catálogo de planos |
| GET | `/usuarios/{nick}/plano` | usuário | Status do próprio plano |
| PUT | `/admin/usuarios/{id}/assinatura` | admin | Atribuir/substituir plano (upsert) |
| DELETE | `/admin/usuarios/{id}/assinatura` | admin | Revogar (volta gratuito) |

**Atribuir (PUT)**: substitui plano em um único save (não exige revogar antes). Body JSON:

```json
{ "codigo": "opiniotop", "duracaoMeses": 1 }
```

```json
{ "codigo": "opiniotop", "vitalicia": true }
```

Opções de duração: `duracaoDias`, `duracaoMeses` ou `expiraEm` (RFC3339). Duração é calculada **a partir de agora** ao trocar de plano.

- `codigo: "gratuito"`: remove expiração e volta ao gratuito
- `vitalicia: true`: plano pago sem data (`assinatura_expira_em = NULL`)

Perfis (`ListarPublico`, `ListarPrivado`, `ListarAdmin`) incluem campo `plano` com `temPlanoTop`, `temPlanoPro`, `ativo`, `vitalicia`.

## Frontend

- `usePlano()` / `PlanoProvider`: plano do usuário logado (`/api/plano`)
- `lib/plano.ts`: helpers `temPlanoTop()`, `temPlanoPro()`, `badgePlano()`
- `types/plano.ts`: `planoVitalicio()`, `rotuloValidadePlano()`, `infoAssinaturaExpirando()`
- Configurações → **Plano e assinatura**: comparativo e status (inclui badge Vitalícia)
- Admin → **Assinaturas** ou Usuários → modal com plano, duração e toggle vitalícia

### Aviso de assinatura perto de vencer

Quando o usuário tem plano pago **ativo** (OpinioTop / OpinioPro), com `assinaturaExpiraEm` definida (não vitalícia), e faltam **até 7 dias** (`DIAS_AVISO_ASSINATURA_EXPIRANDO` em `types/plano.ts`):

- Banner dismissível no topo do conteúdo principal (exceto mensagens, admin e configurações). Dismiss usa `sessionStorage` por data de expiração.
- Nota fixa em Configurações → **Plano e assinatura**.

Não exibe aviso para: gratuito, vitalícia (`assinatura_expira_em` null), ou já expirado (tratado como gratuito por `PlanoAtivo`).

## Admin: atribuir plano

1. Acesse `/admin/assinaturas` ou `/admin/usuarios`
2. Abra o modal de assinatura
3. Escolha plano + duração **ou** marque **Assinatura vitalícia** → **Salvar**
4. Para voltar ao gratuito, selecione **Gratuito** no dropdown e salve (ou use DELETE/revogar)

## Feature gates (outros agentes)

**Backend:** use `modelos.TemPlanoTop(usuario)` / `TemPlanoPro(usuario)` no controller.

**Frontend:** prefira `usePlano().temPlanoTop` ou `plano.temPlanoTop` da resposta de perfil; não use só `assinaturaId` (ignora expiração).
