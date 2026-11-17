const db = require('../../lib/db');
const { exigirAdmin } = require('../../lib/auth');
const { json, corpo } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
  if (!exigirAdmin(req, res, { mutacao: true })) return;
  const id = Number((corpo(req) || {}).id);
  if (!Number.isInteger(id) || id < 1) return json(res, 400, { erro: 'ID inválido.' });
  try {
    await db.init();
    await db.remover(id);
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('remover:', e);
    return json(res, 500, { erro: 'Erro ao remover.' });
  }
};
