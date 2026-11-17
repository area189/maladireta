const crypto = require('crypto');
const db = require('../../lib/db');
const mail = require('../../lib/mail');
const { json, ip, corpo, apiUrl, cors } = require('../../lib/http');

const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
const OK_MSG = 'Quase lá! Se este e-mail ainda não estiver confirmado, enviamos um link para você. Clique nele para ativar o cadastro.';

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
  const d = corpo(req);
  if (!d) return json(res, 400, { erro: 'Dados inválidos.' });

  const nome = String(d.nome || '').replace(/\s+/g, ' ').trim();
  const email = String(d.email || '').trim().toLowerCase();

  if (d.site) return json(res, 200, { ok: true, mensagem: OK_MSG }); // honeypot anti-robô
  if (nome.split(' ').length < 2 || nome.length < 5 || nome.length > 120) {
    return json(res, 400, { erro: 'Informe seu nome completo (nome e sobrenome).', campo: 'nome' });
  }
  if (!EMAIL_RE.test(email) || email.length > 160) {
    return json(res, 400, { erro: 'Informe um e-mail válido.', campo: 'email' });
  }

  try {
    await db.init();
    if (!(await db.limite('inscrever', ip(req), 6, 3600))) {
      return json(res, 429, { erro: 'Muitas tentativas. Tente novamente mais tarde.' });
    }
    const atual = await db.buscarPorEmail(email);
    if (atual && atual.confirmado && atual.ativo) {
      return json(res, 200, { ok: true, mensagem: OK_MSG }); // resposta igual: não revela quem já está na lista
    }
    const tokenConf = crypto.randomBytes(32).toString('base64url');
    const tokenSaida = atual ? atual.token_saida : crypto.randomBytes(24).toString('base64url');
    await db.salvarPendente({ nome, email, tokenConf, tokenSaida });

    const link = `${apiUrl()}/api/newsletter/confirmar?token=${tokenConf}`;
    const r = await mail.enviar([mail.confirmacao(nome, email, link)]);
    if (r[0].erro) {
      console.error('Falha ao enviar confirmação:', r[0].erro);
      return json(res, 502, { erro: 'Não foi possível enviar o e-mail de confirmação agora. Tente de novo em alguns minutos.' });
    }
    return json(res, 200, { ok: true, mensagem: OK_MSG });
  } catch (e) {
    console.error('inscrever:', e);
    return json(res, 500, { erro: 'Erro interno. Tente novamente em instantes.' });
  }
};
