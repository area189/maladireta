const db = require('../../lib/db');
const auth = require('../../lib/auth');
const { json, ip, corpo } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
  if (!process.env.ADMIN_PASSWORD) {
    return json(res, 503, { erro: 'Painel desativado: defina ADMIN_PASSWORD no Vercel.' });
  }
  try {
    await db.init();
    if (!(await db.limite('login', ip(req), 8, 900))) {
      return json(res, 429, { erro: 'Muitas tentativas. Aguarde 15 minutos.' });
    }
    const d = corpo(req) || {};
    if (auth.senhaCorreta(d.senha)) {
      return json(res, 200, { ok: true }, { 'Set-Cookie': auth.criarCookie() });
    }
    await new Promise((r) => setTimeout(r, 800));
    return json(res, 401, { erro: 'Senha incorreta.' });
  } catch (e) {
    console.error('login:', e);
    return json(res, 500, { erro: 'Erro interno.' });
  }
};
