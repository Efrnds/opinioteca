# Opinioteca

Rede social para amantes de livros: avaliações, estante, diário de leitura, mensagens, descoberta e planos (OpinioTop / OpinioPro).

> Trabalho de conclusão / produto proprietário. **Não é software livre.**

## Aviso legal - uso proibido

Este projeto é **proprietário**. Todos os direitos reservados.

**É proibido** usar, copiar, modificar, distribuir, fazer fork, republicar ou explorar comercialmente (ou de qualquer outra forma) o código e os materiais deste repositório **sem autorização prévia e por escrito** do titular.

Os termos completos estão em [`LICENSE`](./LICENSE).

Se você encontrou este código sem permissão, não o utilize: apague as cópias locais e não redistribua.

## Estrutura

```
opinioteca/
├── backend/     # API Go (PostgreSQL, WebSocket, uploads)
├── frontend/    # App Next.js (App Router, Auth.js)
├── docs/        # Documentação interna
├── LICENSE      # Licença proprietária
└── README.md
```

| Parte | Stack |
|-------|--------|
| Backend | Go, PostgreSQL, Gorilla Mux/WebSocket |
| Frontend | Next.js, React, Tailwind, Auth.js / NextAuth |
| Infra típica | Docker (DB), nginx / NPM na frente |

Detalhes de operação do backend (Docker, sessão, WebSocket): ver [`backend/readme.MD`](./backend/readme.MD).

## Quem pode desenvolver

Apenas pessoas **autorizadas** pelo titular. Contribuidores externos não são aceitos sem acordo explícito.

## Contato

Titular: **Eduardo (efrnds)**  
Repositório: [github.com/efrnds/opinioteca](https://github.com/efrnds/opinioteca)

---

Copyright © 2026 Eduardo (efrnds). Todos os direitos reservados.
