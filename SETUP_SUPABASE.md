# Recriar o projeto Supabase — workspace-app

O schema foi reconstruído a partir do código (não existe backup/migration salvo no
repositório). Dados antigos (usuários, workspaces, reservas, imagens) **não são
recuperáveis** — isso recria só a estrutura.

## 1. Criar o projeto

1. https://supabase.com/dashboard → **New project**.
2. Pegue a **Project URL** e a chave pelo dialog **Connect** (botão no topo do
   dashboard do projeto) — ou em **Settings** (ícone de engrenagem, menu lateral)
   → **API Keys**.
   - A Supabase migrou de `anon`/`service_role` para `publishable`/`secret` keys.
     A `publishable key` (formato `sb_publishable_...`) funciona como substituta
     direta da `anon key` no `supabase-js` — não precisa mudar nada no código,
     é só usar ela mesmo (não a legacy `anon` JWT).
   - A **Project URL** também aparece na própria URL do dashboard, entre
     `/project/` e `/settings/...`.

## 2. Rodar o schema

1. SQL Editor → cole o conteúdo de `schema.sql` → **Run**.
2. Isso cria as tabelas `profiles`, `workspaces`, `reservations`, as policies de RLS
   e o bucket de Storage `workspaces` (público).
3. Confira em **Settings → Integrations → Data API** se as tabelas novas estão
   expostas à API (em projetos novos, isso costuma vir habilitado por padrão via
   "Default privileges for new entities" — mas vale conferir, senão as chamadas do
   `supabase-js` retornam 404/erro de permissão).

## 3. Configurar Auth

O app usa `supabase.auth.signUp` / `signInWithPassword` e espera receber um
`access_token` imediatamente após o cadastro (não há tela de confirmação de e-mail
no front-end).

- Authentication → Providers → Email → desmarque **Confirm email**
  (senão o login falha até o usuário confirmar o e-mail manualmente).

## 4. Conferir o Storage

- Storage → confirme que o bucket `workspaces` existe e está **Public**.
- Não precisa criar as pastas `spaces/` e `avatars/` manualmente — o app cria on
  the fly no upload.

## 5. Atualizar credenciais

`.env` (local) e variáveis de ambiente no Vercel (Project Settings → Environment
Variables) — ambos ficam de fora do git:

```
SUPABASE_URL=<nova Project URL>
SUPABASE_KEY=<nova anon public key>
```

Depois, redeploy no Vercel para aplicar as novas variáveis.

## 6. Validar

Testar na ordem (cada passo depende do anterior):

1. Registro de usuário (`register.html` → `/api/users/user_login/register`)
2. Login (`login.html` → `/api/users/user_login`)
3. Atualizar perfil (`user_profile_update.html`) — cria a linha em `profiles`
4. Cadastrar um workspace (`space_manage.html`, sem `space_id` na URL)
5. Upload de imagem do workspace
6. Listar/filtrar workspaces na home (`index.html`)
7. Ver detalhes + calendário (`space_details.html`)
8. Criar uma reserva

## Ressalva de segurança

As policies de RLS geradas são **permissivas** (`using (true)`) porque o backend
usa a chave `anon` sem propagar o JWT do usuário nas queries — é assim que o
projeto original funcionava. Isso significa que, tecnicamente, qualquer pessoa
com a anon key pode ler/escrever nas tabelas diretamente (não só pelo seu app).
Para um projeto de produção real, o ideal seria repassar o JWT do usuário em cada
chamada Supabase (`supabase.auth.setSession` ou client por-requisição) e restringir
as policies por `auth.uid()`. Não fiz essa mudança porque exigiria alterar o
código do backend, e o pedido foi recriar o que já existia.
