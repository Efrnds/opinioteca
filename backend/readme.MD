# Doc oficial backend opinioteca

Esta é a documentação oficial do backend do TCC Opinioteca, nele você pode encontrar como subir o banco de dados e como iniciar a api, além de comandos úteis para a usabilidade do mesmo

### Subir o banco
`docker compose up -d`

### Ver se o banco subiu
`docker compose ps`

### Ver logs do banco
`docker compose logs -f db`

### Acessar o banco
`docker compose exec db psql -U opinioteca -d opinioteca`

### Parar o banco
`docker compose down`

### Parar banco e recriar o schema do zero (Apaga os dados atuais!)
`docker compose down -v && docker compose up -d`

### Session bleed / “já logado como outra pessoa” (Nginx Proxy Manager)

Sintoma crítico: alguém que **nunca** abriu a Opinioteca entra e já está autenticado como outro usuário; ou após login cai na conta errada.

**Causa #1 (mais provável):** no Proxy Host do NPM, **Cache Assets = ON**. Isso pode cachear HTML/RSC, `/api/auth/session` e até respostas com `Set-Cookie`, servindo a sessão de A para B.

Checklist NPM (`opinioteca.prismapp.com.br`):
1. **Cache Assets: OFF** (desligar por completo neste host)
2. Purge/clear cache do host
3. Force SSL: ON
4. Custom location `/ws` → backend Go com Upgrade (ver abaixo)
5. Confirmar que **não** há cache em `/api/auth/*`

**Causa #2:** `AUTH_SECRET` compartilhado com calmera-os (ou outro app) **e** cookie com `Domain=.prismapp.com.br`. O front agora usa cookies host-only `__Host-opinioteca.*` — ainda assim **gere um `AUTH_SECRET` exclusivo** para a Opinioteca e redeploy.

O middleware/Next envia `Cache-Control: private, no-store` e valida identidade contra o backend em `/api/auth/validate-identity`.

### WebSocket em produção (`wss://.../ws` falha no browser)

O front (autenticado) conecta em `wss://SEU_DOMINIO/ws?token=JWT`. Isso **não é login** — o JWT já existe; o WS só serve notificações/mensagens em tempo real. Se o WS cair, o app continua via REST (badges carregam no load; não atualizam ao vivo).

Sintomas típicos no Firefox:
- `can't establish a connection to the server at wss://...`
- `connection ... was interrupted while the page was loading`

Causa mais comum: nginx/OpenResty **sem** proxy de upgrade para `/ws` (ou um `location` regex que captura `/ws` sem `Upgrade` / `Connection`).

**Fix no servidor (Daniel / prismapp):** aplicar o bloco de `deploy/nginx-opinioteca.conf`:

```nginx
location ^~ /ws {
    proxy_pass http://127.0.0.1:4668;   # porta do Go
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400s;
    proxy_buffering off;
}
```

Checklist:
1. Backend Go escutando (porta padrão `4668`)
2. `nginx -t && systemctl reload nginx` (ou openresty)
3. Teste: `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" "https://SEU_DOMINIO/ws?token=JWT_VALIDO"` — deve retornar `101 Switching Protocols`
4. Opcional no front: `NEXT_PUBLIC_WS_URL=wss://seu-dominio` só se o WS estiver em outro host

Migração do banco (spoiler, mídia, etc.): `psql ... -f sql/migration_prod.sql`