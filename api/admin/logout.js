const auth = require('../../lib/auth');
const { json } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
  return json(res, 200, { ok: true }, { 'Set-Cookie': auth.limparCookie() });
};
