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

### WebSocket em produção (erro 502 em `/ws`)

O front conecta em `wss://SEU_DOMINIO/ws`. O **502 Bad Gateway** significa que o nginx não está repassando o upgrade WebSocket para o backend Go.

1. Configure o proxy conforme `deploy/nginx-opinioteca.conf`
2. Garanta que o backend Go está rodando (porta padrão `4668`)
3. Opcional no front: `NEXT_PUBLIC_WS_URL=wss://seu-dominio` (se o WS estiver em outro host)

Migração do banco (spoiler, mídia, etc.): `psql ... -f sql/migration_prod.sql`