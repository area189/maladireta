const db = require('../../lib/db');
const mail = require('../../lib/mail');
const { exigirAdmin } = require('../../lib/auth');
const { json } = require('../../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { erro: 'Método não permitido.' });
  if (!exigirAdmin(req, res)) return;
  try {
    await db.init();
    const [inscritos, historico] = await Promise.all([db.listar(), db.listarCampanhas()]);
    return json(res, 200, { inscritos, historico, smtp_configurado: mail.configurado() });
  } catch (e) {
    console.error('inscritos:', e);
    return json(res, 500, { erro: 'Erro ao consultar o banco.' });
  }
};
