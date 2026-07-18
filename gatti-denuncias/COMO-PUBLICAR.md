# Como colocar a Central de Denúncias no ar — de graça

Este guia tem duas partes:
1. **Como executar o projeto** (no seu computador, para testar)
2. **Passo a passo para hospedar de graça**, publicamente, para os funcionários usarem

---

# Parte 1 — Como executar (rodar o projeto)

## Pré-requisito: instalar o Node.js

1. Acesse **https://nodejs.org**
2. Baixe a versão **LTS** (a recomendada, não a "Current")
3. Instale normalmente (Next, Next, Next)
4. Para confirmar que instalou, abra o terminal (Prompt de Comando no Windows, Terminal no Mac) e digite:
   ```bash
   node -v
   ```
   Deve aparecer um número de versão, tipo `v20.x.x`.

## Passo a passo para executar

1. Abra o terminal e entre na pasta `server` do projeto:
   ```bash
   cd caminho/onde/voce/salvou/gatti-denuncias/server
   ```

2. Crie o arquivo de configuração a partir do modelo:
   ```bash
   cp .env.example .env
   ```
   (No Windows, se `cp` não funcionar, apenas copie e cole o arquivo `.env.example` manualmente e renomeie a cópia para `.env`.)

3. Abra o `.env` em um editor de texto e troque os valores de `JWT_SECRET` e `ADMIN_JWT_SECRET` por textos aleatórios longos e diferentes entre si. Gere um valor rodando:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Rode duas vezes (um valor para cada segredo).

   Para rodar **localmente**, deixe a linha `MONGODB_URI` comentada/vazia — os dados vão ficar salvos em `server/data/db.json`.

4. Instale as dependências do projeto (baixa tudo que ele precisa para funcionar):
   ```bash
   npm install
   ```

5. Crie o login da psicóloga:
   ```bash
   npm run criar-admin
   ```
   Ele vai perguntar um nome de usuário e uma senha (mínimo 8 caracteres). Ou, se preferir pular as perguntas:
   ```bash
   npm run criar-admin -- usuario.psicologa "umaSenhaForte123"
   ```

6. Suba o servidor:
   ```bash
   npm start
   ```
   Vai aparecer: `Central de Denúncias Gatti rodando em http://localhost:3000`

7. Abra o navegador em:
   - `http://localhost:3000` → registrar denúncia
   - `http://localhost:3000/acompanhar` → funcionário acompanha
   - `http://localhost:3000/admin` → painel da psicóloga

   Para parar o servidor, volte ao terminal e aperte `Ctrl + C`.

Isso é só para **testar no seu computador** — nesse modo, só você consegue acessar (o link só existe dentro da sua máquina). Para os funcionários acessarem de verdade, siga a Parte 2.

---

# Parte 2 — Hospedar de graça (acessível para todos os funcionários)

## Por que não dá para usar hospedagem 100% gratuita "simples"

Esse projeto agora tem login e um banco de dados de verdade — então precisa de um servidor **rodando o tempo todo** (não só arquivos estáticos). Fiz um teste real aqui antes de te passar esse guia, e o resultado foi:

- **Render (plano gratuito):** hospeda o servidor de graça, mas **apaga o disco local toda vez que o serviço reinicia ou "dorme" por inatividade** — o que acontece toda hora no plano free. Ou seja: sem ajuste, as denúncias sumiriam sozinhas.
- **Railway:** o "gratuito" hoje é só um crédito de teste de alguns dias — depois disso, cobra.

**A solução: usar o Render (gratuito) só para rodar o código, e o MongoDB Atlas (gratuito para sempre, sem prazo de validade) para guardar os dados.** O projeto já vem pronto para isso — é só configurar uma variável de ambiente (`MONGODB_URI`) que ele muda sozinho de "arquivo local" para "MongoDB" automaticamente.

## Passo 1 — Criar o banco de dados gratuito (MongoDB Atlas)

1. Acesse **https://cloud.mongodb.com** e crie uma conta gratuita (pode ser com Google).
2. Ao criar o primeiro projeto, escolha a opção de cluster **M0 (Free)** — é gratuito para sempre, sem cartão de crédito.
3. Escolha qualquer região (de preferência uma perto do Brasil, tipo São Paulo/AWS `sa-east-1`, se disponível).
4. Em **Security → Database Access**, crie um usuário de banco de dados (nome de usuário + senha — anote os dois).
5. Em **Security → Network Access**, clique em **Add IP Address** e escolha **Allow Access from Anywhere** (`0.0.0.0/0`). Isso é necessário porque o Render usa IPs variáveis.
6. Depois que o cluster terminar de ser criado (leva 1-3 minutos), clique em **Connect → Drivers**, escolha Node.js, e copie a "connection string" — algo parecido com:
   ```
   mongodb+srv://usuario:<senha>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Troque `<senha>` pela senha real que você criou no passo 4. Guarde essa string completa — você vai usar no próximo passo.

## Passo 2 — Subir o projeto para o GitHub

1. Crie uma conta em **https://github.com** se ainda não tiver.
2. Crie um repositório novo (marque como **privado**, já que é um sistema sensível).
3. Na pasta `gatti-denuncias` (a pasta raiz, que contém `server/` e `public/`), rode:
   ```bash
   git init
   git add .
   git commit -m "Central de Denúncias Gatti"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
   git push -u origin main
   ```
   O `.gitignore` já está configurado para **não** subir o `.env`, `node_modules`, o banco local (`data/db.json`) nem os anexos — isso é proposital, por segurança.

## Passo 3 — Publicar no Render

1. Crie uma conta gratuita em **https://render.com** (dá para entrar direto com GitHub).
2. Clique em **New → Web Service**.
3. Conecte o repositório que você acabou de criar.
4. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Antes de criar, abra a seção **Environment Variables** e adicione:

   | Nome | Valor |
   |---|---|
   | `JWT_SECRET` | (gere um valor aleatório — veja o comando na Parte 1, passo 3) |
   | `ADMIN_JWT_SECRET` | (outro valor aleatório, diferente do de cima) |
   | `MONGODB_URI` | a connection string que você copiou no Passo 1 |

6. Clique em **Create Web Service**. O Render vai instalar as dependências e subir o servidor — acompanhe pela aba "Logs". Deve aparecer `[store] conectado ao MongoDB Atlas com sucesso.` e depois `Central de Denúncias Gatti rodando em...`.
7. O Render te dá uma URL pública, algo como `https://gatti-denuncias.onrender.com`. Esse já é o link que os funcionários vão usar.

### Sobre o "spin down" do plano gratuito

O plano free do Render "dorme" o serviço depois de 15 minutos sem uso, e demora uns 30-60 segundos para acordar na próxima visita. Para um canal de denúncias interno (uso esporádico), isso é perfeitamente aceitável — o funcionário só vai perceber que a primeira página demorou um pouco mais para carregar. Como os dados agora ficam no MongoDB (que nunca dorme), nada se perde nesse processo.

## Passo 4 — Criar o login da psicóloga em produção

Depois que o serviço estiver no ar, você precisa criar a conta de admin **nesse ambiente** (não é a mesma coisa do que você criou localmente, se criou — são bancos de dados diferentes a não ser que você já use o mesmo MONGODB_URI local também).

1. No painel do Render, abra seu serviço e clique na aba **Shell** (terminal dentro do navegador).
2. Rode:
   ```bash
   npm run criar-admin -- usuario.psicologa "umaSenhaForte123"
   ```
3. Pronto — a psicóloga já pode entrar em `https://sua-url.onrender.com/admin`.

## Passo 5 — Testar antes de divulgar

1. Acesse a URL pública e envie uma denúncia de teste — anote o protocolo e a senha.
2. Acesse `/acompanhar`, faça login com esse protocolo e senha, confirme que aparece certinho.
3. Acesse `/admin`, entre com o usuário criado no Passo 4, responda à denúncia de teste e mude o status.
4. Volte para `/acompanhar` e confirme que a resposta chegou.
5. Se quiser, apague essa denúncia de teste depois — pelo MongoDB Atlas (aba **Browse Collections** do seu cluster, coleção `complaints`), procure pelo protocolo de teste e exclua o documento manualmente.

## Passo 6 — Divulgar para os funcionários

> A Gatti mantém um canal de denúncias anônimo, acompanhado pela psicóloga organizacional, em conformidade com a NR-1. Você pode relatar situações de assédio, riscos de segurança ou qualquer conduta inadequada sem se identificar — e acompanhar o andamento do seu caso usando o protocolo e a senha que você mesmo cria no envio.
> [link da URL do Render aqui]

---

## Alternativa: hospedagem paga, mas mais estável

Se no futuro o "dormir" do plano gratuito incomodar (ex: a empresa crescer e usar bastante), o upgrade mais simples é o plano pago do próprio Render (a partir de ~US$7/mês), que elimina o spin-down — sem precisar mudar nada no código, só trocar o tipo de instância no painel.

---

## Dúvidas comuns

**Isso é mesmo gratuito para sempre?**
O MongoDB Atlas M0 é gratuito permanentemente (sem prazo de validade), com 512 MB de armazenamento — bastante para milhares de denúncias em texto, e um número razoável de anexos (cada arquivo é limitado a 10 MB). O Render free também não expira, mas tem o limite de "dormir" após inatividade, como explicado acima.

**O que acontece se os 512 MB do MongoDB acabarem?**
Isso demoraria muito tempo para uma empresa de porte médio (denúncias são só texto + poucos anexos). Se um dia chegar perto do limite, dá para fazer upgrade para o plano pago do Atlas (a partir de poucos dólares por mês) sem precisar trocar nada no código.

**Quem tem acesso às denúncias?**
Só quem tiver login em `/admin` (criado com `npm run criar-admin`) e, tecnicamente, quem tiver acesso à sua conta do MongoDB Atlas e do Render — trate essas credenciais como muito sensíveis, com autenticação de dois fatores ativada nessas contas.

**Como eu crio uma segunda conta de admin?**
Repita o Passo 4 com um nome de usuário diferente.

**Perco alguma coisa se eu rodar localmente sem MONGODB_URI e depois publicar com MONGODB_URI?**
São bancos de dados diferentes (um é o arquivo local, outro é a nuvem), então sim — o que você criar localmente (sem MONGODB_URI) fica só na sua máquina. Para testar o fluxo real de produção, você pode colocar o mesmo MONGODB_URI no seu `.env` local também.
