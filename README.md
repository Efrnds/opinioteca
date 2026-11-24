# Opinioteca

Rede social para amantes de livros: avaliações, estante, diário de leitura, mensagens, descoberta e planos (OpinioTop / OpinioPro).

> Trabalho de conclusão / produto proprietário. **Não é software livre.**

## Aviso legal - uso proibido

Este projeto é **proprietário**. Todos os direitos reservados.

**É proibido** usar, copiar, modificar, distribuir, fazer fork, republicar ou explorar comercialmente (ou de qualquer outra forma) o código e os materiais deste repositório **sem autorização prévia e por escrito** do titular.

Os termos completos estão em [`LICENSE`](./LICENSE).

## Arquitetura MVC

O projeto segue o padrão **Model–View–Controller** de ponta a ponta:

```
Requisição HTTP
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  CONTROLLER │────▶│    MODEL     │────▶│  PostgreSQL     │
│  (API Go)   │◀────│  entidades + │◀────│                 │
└─────────────┘     │  repositórios│     └─────────────────┘
      │             └──────────────┘
      │ JSON
      ▼
┌─────────────┐
│    VIEW     │  Next.js (páginas, componentes, UI)
│  (frontend) │
└─────────────┘
```

| Camada | Onde fica | Responsabilidade |
|--------|-----------|------------------|
| **Model** | `backend/src/model/` | Dados: structs (`modelos`), SQL (`repositorios`), conexão (`banco`) |
| **Controller** | `backend/src/controller/` | HTTP: handlers, rotas, middlewares (auth/admin) |
| **View** | `frontend/` | Interface: App Router, componentes, Auth.js |
| Infra (apoio) | `backend/src/infra/` | JWT, e-mail, upload, WebSocket, PDF, integrações — não é regra de negócio |

### Fluxo típico (ex.: criar avaliação)

1. **View** — formulário no Next.js chama a API  
2. **Controller** — `controllers/avaliacoes.go` valida e orquestra  
3. **Model** — `repositorios` persiste; `modelos` tipa o dado  
4. Resposta JSON volta para a **View**

### Estrutura do repositório

```
opinioteca/
├── backend/                 # Model + Controller (+ infra)
│   ├── main.go
│   ├── docker-compose.yml   # PostgreSQL
│   ├── sql/                 # schema e migrations
│   └── src/
│       ├── model/           # ★ MODEL
│       │   ├── modelos/
│       │   ├── repositorios/
│       │   └── banco/
│       ├── controller/      # ★ CONTROLLER
│       │   ├── controllers/
│       │   ├── router/
│       │   └── middlewares/
│       └── infra/           # auth, config, upload, ws, …
└── frontend/                # ★ VIEW (Next.js)
    ├── app/                 # páginas / rotas da UI
    ├── components/
    └── lib/
```

| Parte | Stack |
|-------|--------|
| Backend | Go, PostgreSQL, Gorilla Mux/WebSocket |
| Frontend | Next.js, React, Tailwind, Auth.js / NextAuth |
| Infra típica | Docker (DB), nginx / NPM na frente |

Detalhes de operação do backend: [`backend/readme.MD`](./backend/readme.MD).

## Quem pode desenvolver

Apenas pessoas **autorizadas** pelo titular. Contribuidores externos não são aceitos sem acordo explícito.

## Contato

Titular: **Eduardo (efrnds)**  
Repositório: [github.com/efrnds/opinioteca](https://github.com/efrnds/opinioteca)

---

Copyright © 2026 Eduardo (efrnds). Todos os direitos reservados.
