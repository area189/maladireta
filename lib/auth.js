const crypto = require('crypto');
const { json } = require('./http');

const TTL = 8 * 3600;

function segredo() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

function assinar(v) {
  return crypto.createHmac('sha256', segredo()).update(v).digest('hex');
}

function criarCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return `sessao_admin=${exp}.${assinar(exp)}; Path=/; Max-Age=${TTL}; HttpOnly; Secure; SameSite=Strict`;
}

function limparCookie() {
  return 'sessao_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict';
}

function sessaoValida(req) {
  const c = (req.headers && req.headers.cookie) || '';
  for (const parte of c.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0 || parte.slice(0, i).trim() !== 'sessao_admin') continue;
    const [exp, sig] = parte.slice(i + 1).trim().split('.');
    if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
    const esperado = assinar(exp);
    return sig.length === esperado.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado));
  }
  return false;
}

function senhaCorreta(s) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(s)).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Retorna true se pode continuar; caso contrário já respondeu com erro. */
function exigirAdmin(req, res, { mutacao = false } = {}) {
  if (!process.env.ADMIN_PASSWORD) {
    json(res, 503, { erro: 'Painel desativado: defina ADMIN_PASSWORD no Vercel.' });
    return false;
  }
  if (!sessaoValida(req)) {
    json(res, 401, { erro: 'não autorizado' });
    return false;
  }
  if (mutacao && req.headers['x-requested-with'] !== 'fetch') {
    json(res, 400, { erro: 'requisição inválida' });
    return false;
  }
  return true;
}

module.exports = { criarCookie, limparCookie, sessaoValida, senhaCorreta, exigirAdmin };
