const nodemailer = require('nodemailer');
const { esc } = require('./http');

const CONTA = process.env.GMAIL_USER || 'canalaovivonorio@gmail.com';
const NOME_REMETENTE = 'Ao Vivo no Rio';

function senha() {
  // aceita GMAIL_APP_PASSWORD ou SMTP_PASSWORD; remove espaços da senha de app
  return String(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
}

function configurado() {
  return !!senha();
}

function transporte() {
  if (!configurado()) throw new Error('GMAIL_APP_PASSWORD (ou SMTP_PASSWORD) não configurada');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: CONTA, pass: senha() },
  });
}

/** Envia uma lista de mensagens. Retorna [{ email, erro|null }]. */
async function enviar(msgs) {
  const t = transporte();
  const saida = [];
  try {
    for (const m of msgs) {
      try {
        await t.sendMail({ from: { name: NOME_REMETENTE, address: CONTA }, ...m });
        saida.push({ email: m.to.address, erro: null });
      } catch (e) {
        saida.push({ email: m.to.address, erro: String((e && e.message) || e) });
      }
    }
  } finally {
    t.close();
  }
  return saida;
}

function primeiroNome(nome) {
  return String(nome).trim().split(/\s+/)[0];
}

function confirmacao(nome, email, link) {
  const n = primeiroNome(nome);
  const text = `Olá, ${n}!\n\nRecebemos seu pedido para entrar na newsletter do Ao Vivo no Rio.\n` +
    `Para confirmar seu cadastro, clique no link abaixo:\n\n${link}\n\n` +
    'Se não foi você, é só ignorar este e-mail: nada será feito.\n\n— Ao Vivo no Rio';
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#26104f;color:#f6f0ff;padding:28px;border:3px solid #39ff14;border-radius:12px">
<h2 style="margin:0 0 12px;color:#39ff14">Confirme seu cadastro</h2>
<p>Olá, ${esc(n)}!</p><p>Recebemos seu pedido para entrar na newsletter do <b>Ao Vivo no Rio</b>. Para ativar o cadastro, clique no botão:</p>
<p style="text-align:center;margin:26px 0"><a href="${esc(link)}" style="background:#39ff14;color:#170a33;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:8px;display:inline-block">CONFIRMAR CADASTRO</a></p>
<p style="font-size:13px;color:#bba9e8">Se o botão não funcionar, copie este endereço no navegador:<br>${esc(link)}</p>
<p style="font-size:13px;color:#bba9e8">Se não foi você, ignore este e-mail: nada será feito.</p></div>`;
  return {
    to: { name: nome.replace(/[\r\n"<>]/g, ''), address: email },
    subject: 'Confirme seu cadastro na newsletter do Ao Vivo no Rio', text, html,
  };
}

function textoParaHtml(msg) {
  return msg.trim().split(/\n\s*\n/).filter((p) => p.trim()).map((p) => {
    const h = esc(p.trim()).replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#39ff14">$1</a>');
    return `<p style="margin:0 0 14px;line-height:1.55">${h}</p>`;
  }).join('');
}

function newsletter(inscrito, assunto, mensagem, linkSair) {
  const text = `${mensagem}\n\n—\nPara deixar de receber: ${linkSair}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#26104f;color:#f6f0ff;padding:26px;border:3px solid #39ff14;border-radius:12px">
<h2 style="margin:0 0 16px;color:#39ff14">${esc(assunto)}</h2>${textoParaHtml(mensagem)}
<hr style="border:0;border-top:1px dashed #7a2cff;margin:22px 0"><p style="font-size:12px;color:#bba9e8">Você recebe este e-mail porque confirmou seu cadastro na newsletter do Ao Vivo no Rio.
<a href="${esc(linkSair)}" style="color:#bba9e8">Deixar de receber</a></p></div>`;
  return {
    to: { name: String(inscrito.nome).replace(/[\r\n"<>]/g, ''), address: inscrito.email },
    subject: assunto.replace(/[\r\n]+/g, ' '), text, html,
    headers: { 'List-Unsubscribe': `<${linkSair}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/** Testa o login no Gmail sem enviar nada. Retorna { ok, conta, erro? } (nunca devolve a senha). */
async function testar() {
  try {
    const t = transporte();
    await t.verify();
    t.close();
    return { ok: true, conta: CONTA, tamanho_senha: senha().length };
  } catch (e) {
    return { ok: false, conta: CONTA, tamanho_senha: senha().length,
      erro: String((e && e.message) || e).slice(0, 300), codigo: e && (e.code || e.responseCode) || null };
  }
}

module.exports = { configurado, enviar, confirmacao, newsletter, testar };
