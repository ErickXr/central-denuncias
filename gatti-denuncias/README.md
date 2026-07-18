# Central de Denúncias — Gatti

Canal de denúncias anônimas com acompanhamento por protocolo + senha e painel
administrativo para a psicóloga organizacional responder, em conformidade com a NR-1.

## Começando

Veja o guia completo em **[COMO-PUBLICAR.md](./COMO-PUBLICAR.md)** — ele cobre desde
testar localmente até publicar em produção.

Resumo rápido (com Node.js já instalado):

```bash
cd server
cp .env.example .env      # depois edite o .env com segredos aleatórios
npm install
npm run criar-admin       # cria o login da psicóloga
npm start
```

Depois acesse:
- `http://localhost:3000` — registrar denúncia
- `http://localhost:3000/acompanhar` — funcionário acompanha o caso
- `http://localhost:3000/admin` — painel da psicóloga

## Estrutura

```
server/    → backend (Node.js + Express) — API, autenticação, banco de dados
public/    → frontend (HTML, CSS, JS) — o que roda no navegador
```

## Stack utilizada

- **Backend:** Node.js, Express, JWT (autenticação), bcryptjs (senhas), multer (upload de anexos)
- **Banco de dados:** arquivo JSON local por padrão (`server/data/db.json`), ou MongoDB Atlas (gratuito para sempre) se a variável `MONGODB_URI` estiver definida — necessário para hospedagens com disco temporário, como o Render free. Veja o `COMO-PUBLICAR.md`.
- **Frontend:** HTML, CSS e JavaScript puros, sem frameworks — fácil de auditar e manter
