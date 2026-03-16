
# Controle de Uniformes e EPIs — App (Vercel + Google Apps Script)

## Estrutura
- `index.html` — SPA com login por setor (modal) e escopo por setor (RH/Segurança/Admin).
- `api/login.js` — cria sessão (cookie HttpOnly) a partir de setor/senha.
- `api/me.js` — retorna `{setor, role}` a partir da sessão.
- `api/logout.js` — encerra a sessão.
- **(Backend GAS)**: seu Web App do Google Apps Script com validação `APP_GATEWAY_KEY` e filtro por setor.

## Variáveis de Ambiente (Vercel → Project → Settings → Environment Variables)
- `GAS_WEBAPP_URL` — URL do Web App do Apps Script (doGet/doPost).
- `APP_GATEWAY_KEY` — segredo compartilhado com o Apps Script (mesmo valor em *Script properties*).
- `SECRET_SESSION_KEY` — segredo (32+ chars) para assinar a sessão JWT.
- `RH_PASSWORD`, `SEGURANCA_PASSWORD`, `ADMIN_PASSWORD` — senhas de login por setor.

## Publicação
1. Suba esta pasta ao GitHub (ou use `vercel deploy`).
2. Configure as env vars acima no Vercel e redeploy.
3. No Apps Script, em **Project properties → Script properties**, crie `APP_GATEWAY_KEY` com o mesmo valor do Vercel.

## Notas
- Os arquivos `/_sdk/*.js` foram removidos (não existem no Vercel; eram opcionais). 
- O logotipo do topo usa `/logo lsg.png` — ajuste o nome/arquivo conforme seu repositório.
- Ao abrir sem sessão, `/api/me` retornará 401 e a tela de login será exibida (sem erro visível ao usuário).
