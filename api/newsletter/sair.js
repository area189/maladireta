const db = require('../../lib/db');
const { page, json, paginaMsg } = require('../../lib/http');

// GET: clique no link do e-mail. POST: descadastro com um clique (cabeçalho List-Unsubscribe-Post).
module.exports = async (req, res) => {
  const token = String((req.query && req.query.token) || '');
  const post = req.method === 'POST';
  const falha = () => post
    ? json(res, 400, { erro: 'Link inválido.' })
    : page(res, 400, paginaMsg('Link inválido', 'Este link de descadastro não é válido.', false));
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return falha();
  try {
    await db.init();
    if (!(await db.sairPorToken(token))) return falha();
    return post
      ? json(res, 200, { ok: true })
      : page(res, 200, paginaMsg('Descadastro feito', 'Você não receberá mais a newsletter. Sentiremos sua falta!'));
  } catch (e) {
    console.error('sair:', e);
    return post ? json(res, 500, { erro: 'Erro interno.' })
      : page(res, 500, paginaMsg('Erro', 'Não foi possível concluir agora. Tente novamente.', false));
  }
};
