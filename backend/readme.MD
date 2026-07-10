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