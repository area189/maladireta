# Newsletter – Ao Vivo no Rio (versão Vercel)

## Estrutura
```
public/index.html                  seu site com a aba NEWSLETTER
public/painel-q8r4x7m2k5vd.html    página oculta do administrador
api/newsletter/*                   cadastro, confirmação e descadastro
api/admin/*                        login, inscritos, remover, exportar CSV, enviar
lib/                               banco (Postgres), e-mail (Gmail), sessão
```

## Passo a passo

### 1. Senha de app do Gmail
Na conta `canalaovivonorio@gmail.com`: ative a verificação em duas etapas e gere uma senha de app em https://myaccount.google.com/apppasswords (16 letras). Guarde para o passo 4.

### 2. Subir o projeto
Crie um repositório no GitHub com o conteúdo desta pasta (ou use `npx vercel` na pasta). Em vercel.com, **Add New → Project** e importe o repositório. Não precisa configurar build: a pasta `public` é servida como site e `api` vira funções.

### 3. Banco de dados
No projeto da Vercel, aba **Storage** (ou Marketplace) → **Neon (Postgres)** → crie e conecte ao projeto. Isso cria a variável `DATABASE_URL` (ou `POSTGRES_URL`) sozinha; o código aceita as duas. As tabelas são criadas automaticamente no primeiro uso.

### 4. Variáveis de ambiente (Settings → Environment Variables)
| Nome | Valor |
|---|---|
| `GMAIL_APP_PASSWORD` (ou `SMTP_PASSWORD`) | a senha de app do passo 1 (com ou sem espaços) |
| `ADMIN_PASSWORD` | uma senha longa e forte para o painel |
| `SESSION_SECRET` | texto aleatório longo (ex.: 40 caracteres) |
| `SITE_URL` | endereço final do site, ex.: `https://aovivonorio.com.br` (sem `/` no fim) |

Depois faça um **Redeploy** para as variáveis valerem.

### 4b. Site em outro endereço (importante)
O cadastro só funciona onde as funções `api/` existem (a Vercel). Se o `index.html` estiver hospedado em outro lugar (GitHub Pages, Netlify, Hostinger, etc.), o navegador recebe 404/405 e mostra "O cadastro ainda não está disponível". Nesse caso:
1. No `public/index.html`, preencha `var BACKEND_URL='https://SEU-PROJETO.vercel.app';` (busque por `BACKEND_URL`).
2. Na Vercel, crie a variável `API_URL` com o mesmo endereço (para os links de confirmar/sair apontarem para o backend) e faça Redeploy.
3. Abra `https://SEU-PROJETO.vercel.app/api/saude` para conferir: tudo deve aparecer `true`.

### 5. Teste
1. Abra o site → aba **NEWSLETTER**, cadastre seu e-mail e clique no link recebido.
2. Acesse `https://SEU-SITE/painel-q8r4x7m2k5vd`, entre com `ADMIN_PASSWORD` e use **Enviar teste**.

## Painel oculto
O endereço é o nome do arquivo em `public/`. **Troque `q8r4x7m2k5vd` por outro texto seu** (renomeie o arquivo) e não divulgue o link. O endereço secreto é só uma camada extra; a proteção real é a senha (limite de tentativas, sessão de 8 h, cookie HttpOnly/Secure).

## Como o envio funciona
O navegador do administrador envia em lotes de 10 e acompanha o progresso; **mantenha a página aberta até aparecer "Concluído"**. O histórico dos últimos envios aparece no painel.

## Limites e observações
- Gmail comum: cerca de 500 e-mails/dia. Se a lista crescer, troque por Brevo, SendGrid ou Amazon SES (edite `lib/mail.js`).
- O `index.html` tem ~11 MB porque as imagens estão embutidas em base64. Funciona, mas carrega mais devagar; vale hospedar as imagens como arquivos separados em `public/`.
- Cadastro com confirmação por e-mail e descadastro em um clique atendem ao básico da LGPD; considere adicionar um link para sua política de privacidade.
