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