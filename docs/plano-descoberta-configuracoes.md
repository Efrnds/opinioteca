# Plano: Descoberta, Configurações e links compartilhados (convidados)

> Documento de implementação. Decisões de produto **travadas** (§8). Código em andamento conforme ordem de PRs (§7).

---

## 1. Estado atual (achados)

### 1.1 Navegação

- Não existe bottom tab bar. Menu: `frontend/lib/nav.ts` → `itensMenu`, consumido por `MenuEsquerdo` (desktop) e `Header` (hamburger mobile).
- Itens atuais: Home (`/home`), Mensagens, Notificações, Perfil, **Configurações** (`/configuracoes`).
- **`/configuracoes` estava no menu mas a rota não existia** (link morto); agora criada.
- “Ajuda” era stub no desktop: `MenuDireito` (`linksAjuda` → `href="/"`). Substituído por CTA Descoberta.

### 1.2 Auth / convidado

| Camada | Comportamento alvo |
|--------|-------------------|
| `frontend/middleware.ts` | Protege `/home`, `/descoberta`, `/configuracoes`, `/mensagens`, `/notificacoes`. Admin em `/admin*`. **Não** protege `/livros/*`, `/perfil/*`, `/avaliacoes/[id]` (soft-gate). |
| `AuthenticatedLayout` | Sem sessão: shellless + chrome público (`GuestPublicChrome`) nas rotas compartilháveis. |
| Backend | GETs de leitura de livro / avaliação / perfil públicos (auth opcional). Mutations autenticadas. Descoberta autenticada. |
| BFFs Next | GETs públicos encaminham Bearer se houver sessão; sem sessão, chamam backend sem token. |

**Convidados:** só podem **ver** perfis públicos de livro e de usuário. Perfil privado → só foto + nick + aviso. Interações abrem `AuthModal`.

### 1.3 Conta / senha / soft-delete

| Capacidade | Onde |
|------------|------|
| Alterar senha | `POST /usuarios/{nick}/atualizar-senha` |
| Atualizar e-mail (com perfil) | `PUT /usuarios/{nick}` |
| Soft-delete | `DELETE /usuarios/{nick}` → `status = 'inativo'` + `inativado_em = NOW()` |
| Reativar | `POST /usuarios/reativar` (nick+senha) se `inativado_em` dentro de 30 dias |
| Após 30 dias | Soft-delete permanente: login bloqueado; **dados e interações permanecem** para mostrar “conta apagada” |

### 1.4 Preferências / privacidade / notificações

Tabela `usuario_configuracoes` 1:1. Spoiler/streak/prefs de notificação e privacidade persistem e são aplicados no backend/FE.

### 1.5 Descoberta / feeds

Rota autenticada `/descoberta`: livros em alta, recentemente adicionados, usuários sugeridos.

### 1.6 Padrões de UI a reutilizar

- Seções estilo rail: `AdminSidebar` (active `bg-azul-600`) em superfície clara.
- Cards: `Box`; tipografia Gabarito / tokens `azul-*`, `cinza-*`.
- Toggles: `components/ui/switch.tsx`.
- Modais: `Dialog` + motion + sonner.
- Auth: `AuthModal` + `/?auth=login&callbackUrl=…` ou `abrirAuth` global.

---

## 2. Visão do produto (alvo)

### 2.1 Aba Descoberta

Rota autenticada: **`/descoberta`**.

- Em `itensMenu` (ícone `Compass`, rótulo **Descoberta**), após Home.
- Remover stub Ajuda de `MenuDireito` (CTA → `/descoberta` se útil).
- Três seções: **Livros em alta**, **Recentemente adicionados**, **Pra seguir**.

### 2.2 Aba Configurações

Rota: **`/configuracoes`**.

| Seção | Itens |
|-------|--------|
| **Conta** | Alterar senha; E-mail; Apagar conta (soft-delete 30 dias + reativar) |
| **Preferências** | Spoiler por padrão; Mostrar/ocultar streak |
| **Notificações** | Toggles: **Seguidor** (só incoming); Comentário; Votos; Mensagens; **sem** toggle “seguindo” |
| **Plano e assinatura** | Placeholder (“Em breve”); modo zen **ignorado** |
| **Privacidade** | Quem pode mensagem / ver streak / ver histórico: `todos` \| `seguidores` \| `ninguem`; perfil `publico` \| `privado` |
| **Sobre** | Termos e Privacidade (páginas internas); Versão (`package.json`) |

### 2.3 Links compartilhados

- Convidado **vê** livro público e perfil de usuário público.
- Perfil **privado**: não-seguidores / guest → só foto + nick + “perfil privado”.
- Interações sociais abrem **`AuthModal`** com `callbackUrl`.
- `/avaliacoes/[id]` soft-gate (não hard-redirect no middleware).

---

## 3. Modelo de dados

### 3.1 Migration

Arquivo: `backend/sql/migrations/20260708_configuracoes_descoberta.sql` (+ espelhar em `backend/sql/sql.sql`).

#### A) Conta: recuperação 30 dias

```sql
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS inativado_em TIMESTAMP NULL;
```

#### B) Preferências + privacidade + notificações

```sql
CREATE TABLE usuario_configuracoes (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,

  ocultar_spoilers_padrao BOOLEAN NOT NULL DEFAULT TRUE,
  mostrar_streak BOOLEAN NOT NULL DEFAULT TRUE,

  notif_seguidor BOOLEAN NOT NULL DEFAULT TRUE,
  notif_comentario BOOLEAN NOT NULL DEFAULT TRUE,
  notif_votos BOOLEAN NOT NULL DEFAULT TRUE,
  notif_mensagens BOOLEAN NOT NULL DEFAULT TRUE,

  mensagem_de VARCHAR(20) NOT NULL DEFAULT 'todos'
    CHECK (mensagem_de IN ('todos', 'seguidores', 'ninguem')),
  streak_visivel_para VARCHAR(20) NOT NULL DEFAULT 'todos'
    CHECK (streak_visivel_para IN ('todos', 'seguidores', 'ninguem')),
  historico_visivel_para VARCHAR(20) NOT NULL DEFAULT 'todos'
    CHECK (historico_visivel_para IN ('todos', 'seguidores', 'ninguem')),
  visibilidade_perfil VARCHAR(20) NOT NULL DEFAULT 'publico'
    CHECK (visibilidade_perfil IN ('publico', 'privado')),

  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Criar linha no cadastro + lazy-create no GET settings.

### 3.2 Soft-delete

| Comportamento | Regra |
|---------------|-------|
| Apagar | `status='inativo'` + `inativado_em=NOW()` |
| ≤ 30 dias | Login oferece erro com flag `podeReativar`; `POST /usuarios/reativar` |
| > 30 dias | Login impossível; dados **permanecem** (não hard-purge) |
| Conteúdo legado | Autores inativos aparecem como **“conta apagada”** (nick/imagem genéricos ou flag `contaApagada`); sem links quebrados |

### 3.3 Perfil privado (Twitter-like)

- Visitante / guest / não-seguidor: `{ id, nick, image, perfilPrivado: true }` + aviso UI.
- Dono ou seguidor: perfil completo.
- Seguir permanece disponível na página reduzida (follow aberto; sem pedido de aprovação na v1).

---

## 4. APIs

### 4.1 Descoberta (auth obrigatório)

| Método | Backend | BFF |
|--------|---------|-----|
| GET | `/descoberta/livros/em-alta` | `/api/descoberta/livros/em-alta` |
| GET | `/descoberta/livros/recentes` | `/api/descoberta/livros/recentes` |
| GET | `/descoberta/usuarios/sugeridos` | `/api/descoberta/usuarios/sugeridos` |

### 4.2 Configurações

| Método | Backend | Notas |
|--------|---------|-------|
| GET/PUT | `/usuarios/{nick}/configuracoes` | Só dono |
| POST | `/usuarios/{nick}/atualizar-senha` | Já existe |
| DELETE | `/usuarios/{nick}` | Soft-delete + `inativado_em` |
| POST | `/usuarios/reativar` | Público; nick + senha; janela 30 dias |

### 4.3 Preferências em runtime

| Preferência | Onde |
|-------------|------|
| Notificações | `DispararNotificacao`: early-return se flag off; tipos sistema **sempre** enviam |
| Spoilers | FE via settings cache |
| `mostrar_streak` | Esconder UI própria |
| `mensagem_de` | `EnviarMensagem` |
| `streak_visivel_para` / `historico_visivel_para` | Perfil / diário |
| `visibilidade_perfil` | `BuscarUsuario` + GETs relacionados |

### 4.4 Leitura pública

GETs com auth opcional: livro, avaliações do livro, avaliação por id, comentários read-only, perfil por nick (respeitando privacidade). Mutations autenticadas.

---

## 5. Frontend: estrutura

- Nav: Descoberta em `itensMenu`; limpar Ajuda.
- `/configuracoes` com rail + seções.
- `/descoberta` com três seções.
- `ConfiguracoesProvider` + auth-gate + `GuestPublicChrome`.
- Páginas internas `/termos`, `/privacidade`.

---

## 6. Arquivos (checklist)

Ver §7 e implementação no repositório. Migration + modelos + controllers + BFFs + páginas FE conforme PRs abaixo.

---

## 7. Ordem de implementação (PRs)

### PR 1: Schema + API de configurações ✅

- Migration `usuario_configuracoes` + `usuarios.inativado_em`.
- CRUD settings + soft-delete/reativar.
- Hook prefs em notificações + gate mensagem/diario/perfil.

### PR 2: UI Configurações ✅

- Página `/configuracoes` + seções + modais.
- Termos/Privacidade internas; plano placeholder.

### PR 3: Descoberta ✅

- Endpoints + página + item no nav; limpar Ajuda.

### PR 4: Links compartilhados (guest soft-gate) ✅ (base)

- GET públicos + middleware + AuthModal nas ações (`PostCard`, perfil, livro).
- Perfil privado reduzido; “conta apagada” em autores inativos.

### PR 5 (opcional)

- Heurísticas Descoberta; conteúdo jurídico real; verificação de e-mail.

---

## 8. Decisões travadas

| # | Tema | Decisão |
|---|------|---------|
| 1 | Enums privacidade | `todos` \| `seguidores` \| `ninguem` (ASCII). Perfil: `publico` \| `privado`. |
| 2 | Perfil privado | Visitantes veem **só** foto + nick + aviso “perfil privado”. Seguidores e dono veem tudo. Follow aberto na v1 (sem pedido de aprovação). |
| 3 | Notificação seguir | **Um** toggle `notif_seguidor` (incoming only). Sem toggle “seguindo”. |
| 4 | Pós-30 dias | Soft-delete permanente; **sem** hard-purge. Interações exibem “conta apagada”. |
| 5 | Reativar | Fluxo no login (dentro de 30 dias) + `POST /usuarios/reativar`. |
| 6 | Termos / Privacidade | Páginas internas Next (`/termos`, `/privacidade`). |
| 7 | Versão | `frontend/package.json` (`0.1.0`). |
| 8 | Descoberta guests | **Autenticada apenas.** Guests: só livro público + perfil público. |
| 9 | E-mail | Alteração direta (como hoje), sem verificação por link na v1. |
| 10 | Shared review | Soft-gate em `/avaliacoes/[id]`; comentários read-only públicos. |
| 11 | Nomes | `/descoberta`, `/configuracoes`. |

---

## 9. Riscos e notas

- GETs públicos nunca vazam `email` / `ListarPrivado`.
- Filtrar notificações no `DispararNotificacao` (antes do WS).
- Ranking “em alta” degradar para all-time se pouco volume recente.
- Soft-delete deve deixar rastros legíveis (“conta apagada”), não 404 em cadeias de interação.

---

## 10. Resumo executivo

| Área | Alvo |
|------|------|
| Ajuda | Substituída por **Descoberta** |
| Configurações | Página completa + `usuario_configuracoes` |
| Conta | Soft-delete + `inativado_em` + reativar 30 dias; depois soft permanente |
| Guest | Livro + perfil público; AuthModal nas ações; privado = foto+nick+aviso |
| Prefs | Persistidas e enforced |
