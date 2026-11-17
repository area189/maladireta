const db = require('../../lib/db');
const mail = require('../../lib/mail');
const { exigirAdmin } = require('../../lib/auth');
const { json, corpo, siteUrl, apiUrl } = require('../../lib/http');

const TAM_LOTE = 10; // e-mails por chamada (o navegador repete até acabar)
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
  if (!exigirAdmin(req, res, { mutacao: true })) return;
  if (!mail.configurado()) {
    return json(res, 503, { erro: 'GMAIL_APP_PASSWORD não está configurada no Vercel.' });
  }
  const d = corpo(req) || {};
  try {
    await db.init();

    // ---- envio de teste (um único e-mail, sem registrar campanha)
    if (d.teste) {
      const assunto = String(d.assunto || '').trim();
      const mensagem = String(d.mensagem || '').trim();
      const para = String(d.email_teste || '').trim().toLowerCase();
      if (!assunto || !mensagem) return json(res, 400, { erro: 'Preencha assunto e mensagem.' });
      if (!EMAIL_RE.test(para)) return json(res, 400, { erro: 'Informe um e-mail de teste válido.' });
      const r = await mail.enviar([mail.newsletter({ nome: 'Teste', email: para }, assunto, mensagem, siteUrl() + '/')]);
      return r[0].erro ? json(res, 502, { erro: 'Falha no teste: ' + r[0].erro }) : json(res, 200, { ok: true, teste: true });
    }

    // ---- campanha em lotes
    let camp;
    if (d.campanha_id) {
      camp = await db.buscarCampanha(Number(d.campanha_id));
      if (!camp) return json(res, 404, { erro: 'Campanha não encontrada.' });
    } else {
      const assunto = String(d.assunto || '').trim();
      const mensagem = String(d.mensagem || '').trim();
      if (!assunto || !mensagem || assunto.length > 200 || mensagem.length > 20000) {
        return json(res, 400, { erro: 'Preencha assunto e mensagem.' });
      }
      const total = await db.contarConfirmados();
      if (!total) return json(res, 400, { erro: 'Não há inscritos confirmados.' });
      camp = await db.criarCampanha(assunto, mensagem, total);
    }

    const cursor = Number.isInteger(Number(d.cursor)) && Number(d.cursor) > 0 ? Number(d.cursor) : 0;
    const lote = await db.proximosConfirmados(cursor, TAM_LOTE);
    let enviados = 0, falhas = 0;
    const erros = [];
    if (lote.length) {
      const msgs = lote.map((i) => mail.newsletter(i, camp.assunto, camp.mensagem,
        `${apiUrl()}/api/newsletter/sair?token=${i.token_saida}`));
      const r = await mail.enviar(msgs);
      for (const x of r) {
        if (x.erro) { falhas++; if (erros.length < 3) erros.push(`${x.email}: ${x.erro}`); } else enviados++;
      }
      camp = await db.somarCampanha(camp.id, enviados, falhas);
    }
    return json(res, 200, {
      ok: true,
      campanha_id: camp.id,
      cursor: lote.length ? lote[lote.length - 1].id : cursor,
      total: camp.total,
      enviados: camp.enviados,
      falhas: camp.falhas,
      erros,
      concluido: lote.length < TAM_LOTE,
    });
  } catch (e) {
    console.error('enviar:', e);
    return json(res, 500, { erro: 'Erro interno ao enviar.' });
  }
};
