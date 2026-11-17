const db = require('../../lib/db');
const { page, ip, paginaMsg } = require('../../lib/http');

module.exports = async (req, res) => {
  const token = String((req.query && req.query.token) || '');
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return page(res, 400, paginaMsg('Link inválido', 'Este link de confirmação não é válido.', false));
  }
  try {
    await db.init();
    if (!(await db.limite('confirmar', ip(req), 30, 3600))) {
      return page(res, 429, paginaMsg('Muitas tentativas', 'Tente novamente mais tarde.', false));
    }
    if (await db.confirmarPorToken(token)) {
      return page(res, 200, paginaMsg('Cadastro confirmado!', 'Pronto! Você vai receber a newsletter do Ao Vivo no Rio.'));
    }
    return page(res, 400, paginaMsg('Link inválido ou já usado',
      'Este link não é mais válido. Se você já confirmou, está tudo certo!', false));
  } catch (e) {
    console.error('confirmar:', e);
    return page(res, 500, paginaMsg('Erro', 'Não foi possível confirmar agora. Tente novamente em instantes.', false));
  }
};
