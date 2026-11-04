# Atualização de dependências — 4 de novembro de 2026

Foram atualizadas as dependências do frontend e os módulos compatíveis do backend. Nenhuma tabela ou migração do banco foi alterada. A revisão não investigou o servidor comprometido nem determina a causa da invasão.

## Frontend

| Pacote | Antes | Depois |
| --- | --- | --- |
| `@base-ui/react` | `^1.5.0` | `^1.9.0` |
| `@hugeicons/core-free-icons` | `^4.2.0` | `^4.4.0` |
| `@hugeicons/react` | `^1.1.7` | `^1.1.10` |
| `emoji-picker-react` | `^4.19.1` | `^5.1.4` |
| `framer-motion` | `^12.40.0` | `^14.9.1` |
| `lucide-react` | `^1.20.0` | `^1.67.0` |
| `next` | `16.0.6` | `16.4.5` |
| `next-auth` | `5.0.0-beta.31` | `5.0.0-beta.32` |
| `react` | `19.2.0` | `19.3.1` |
| `react-dom` | `19.2.0` | `19.3.1` |
| `sonner` | `^2.0.7` | `^2.0.8` |
| `tailwind-merge` | `^3.6.0` | `^3.7.0` |
| `@tailwindcss/postcss` | `^4` | `^4.3.4` |
| `@types/node` | `^20` | `^26.6.6` |
| `@types/react` | `^19` | `^19.3.0` |
| `@types/react-dom` | `^19` | `^19.3.0` |
| `eslint` | `^9` | `^9.39.5` |
| `eslint-config-next` | `16.0.6` | `16.4.5` |
| `shadcn` | `^4.11.0` | `^4.23.0` |
| `tailwindcss` | `^4` | `^4.3.4` |
| `typescript` | `^5` | `~6.0.3` |

O `pnpm-lock.yaml` também foi regenerado, incluindo dependências transitivas. O `shadcn` passou para `devDependencies`: o projeto usa seu CSS durante o build, sem precisar executar a CLI em produção. O build deve instalar também as dependências de desenvolvimento.

O ESLint ficou em 9.39.5 porque `eslint-plugin-import`, `eslint-plugin-jsx-a11y` e `eslint-plugin-react` ainda não declaram suporte ao ESLint 10. O TypeScript ficou em 6.0.3 porque a versão atual de `typescript-eslint` declara suporte a TypeScript menor que 6.1; atualizar para TypeScript 7 quebraria essa compatibilidade. O Auth.js permanece na linha v5 já usada pelo projeto, com a correção beta.32; a tag `latest` do npm ainda aponta para v4, que exigiria migração da autenticação.

O arquivo `pnpm-workspace.yaml` registra as exceções de idade mínima para as versões exatas recém-publicadas selecionadas nesta atualização, sem desabilitar globalmente essa proteção.

## Backend

- `github.com/dgrijalva/jwt-go` foi substituído por `github.com/golang-jwt/jwt/v5` 5.3.1.
- O formato dos tokens HS256, as claims e a duração de seis horas foram preservados. A validação agora permite explicitamente apenas HS256, o algoritmo emitido pela aplicação.
- `pgx/v5`: 5.10.0 para 5.12.0; `puddle/v2`: 2.2.2 para 2.2.3.
- `golang.org/x/crypto`: 0.52.0 para 0.58.0; `x/image`: 0.44.0 para 0.47.0; `x/sync`: 0.22.0 para 0.24.0; `x/text`: 0.40.0 para 0.43.0.
- As novas versões exigem Go 1.26 ou superior. A validação foi executada com Go 1.27.3.

## Verificações executadas

- `pnpm install --frozen-lockfile`: instalação reproduzível com o lockfile atualizado.
- `pnpm build`: passou, incluindo compilação, tipos e geração das rotas.
- `pnpm typecheck`: passou.
- `pnpm peers check`: sem incompatibilidades declaradas.
- `pnpm lint`: 66 erros e 11 avisos existentes. A comparação com os arquivos do HEAD anterior, usando as mesmas ferramentas atualizadas, encontrou os mesmos resultados por arquivo, regra e severidade, sem novos apontamentos.
- `go test ./...`: passou, incluindo novos testes de tokens antigos, novos, expirados, com assinatura incorreta e com algoritmo inesperado. O teste de integração de descoberta é opcional e requer `OPINIOTECA_TEST_DATABASE_URL`; ele não foi executado nesta rodada.
- `go mod verify`: integridade dos módulos verificada.
- Verificação HTTP do build em localhost: página inicial e endpoints de providers/CSRF retornaram 200; `/home` e `/admin` redirecionaram visitantes sem sessão; a API da estante retornou 401. Os headers de não cache foram mantidos. Login real com Google, publicação de resenha e fluxos autenticados não foram exercitados nesta rodada.

## Resultado de segurança

A auditoria completa do pnpm passou de **9 críticos, 64 altos, 73 moderados e 13 baixos** para **0 críticos, 0 altos, 1 moderado e 1 baixo**.

`pnpm audit --prod` não encontrou vulnerabilidades conhecidas. Isso não é garantia de ausência de falhas.

Os dois alertas restantes estão em ferramentas de desenvolvimento:

- `minimatch`: alerta moderado, em dependências transitivas do ESLint. A correção indicada exige a versão 11; não foi aplicado override global para uma versão major incompatível com os consumidores antigos.
- `deepmerge`: alerta baixo em dependência da CLI `shadcn`, sem versão corrigida indicada pela auditoria.

`govulncheck` não encontrou vulnerabilidades no código nem nos pacotes importados. Há um aviso no módulo `golang.org/x/crypto` sobre `openpgp` (GO-2026-5932), pacote que a aplicação não importa. A correção indicada é uma pseudo-versão posterior à última versão estável; a atualização mantém a versão estável 0.58.0.

## Publicação

Use Node.js 26.13.0 LTS, registrado em `frontend/.nvmrc`, e pnpm 12.17.0, registrado no `packageManager`. O manifesto também aceita a linha Node 24 LTS; nesse caso use o patch de segurança atual da linha e valide no ambiente de destino. Node 20, ainda referenciado pelos tipos antigos, está fora de suporte.

No frontend:

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm audit --prod
pnpm start
```

No backend, use um Go atualizado, no mínimo 1.26, e recompile o binário:

```bash
cd backend
go mod download
go test ./...
go build -o /tmp/opinioteca-api .
```

A atualização do código não remove persistência de um servidor já invadido. A publicação deve usar um ambiente reconstruído e credenciais substituídas, incluindo as chaves de sessão/JWT e os segredos de banco e OAuth que estavam acessíveis ao processo comprometido. Ao trocar as chaves de sessão/JWT, os usuários precisarão entrar novamente.

Referências oficiais:

- [Correções de segurança do Next.js de outubro de 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- [Auth.js beta.32 e correções de autenticação](https://github.com/nextauthjs/next-auth/releases/tag/next-auth@5.0.0-beta.32).
- [Node.js 26.13.0 LTS](https://nodejs.org/en/blog/release/v26.13.0).
- [Migração da biblioteca JWT](https://github.com/golang-jwt/jwt/blob/main/MIGRATION_GUIDE.md).
