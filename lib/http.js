function json(res, status, obj, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(obj));
}

function page(res, status, html) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(html);
}

function ip(req) {
  const h = req.headers || {};
  return h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) || 'desconhecido';
}

function corpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : null;
}

function siteUrl() {
  const u = process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '');
  return u.replace(/\/$/, '');
}

/** Endereço onde as funções /api rodam (links de confirmar/sair). Se o site estiver em outro
 *  domínio que não o da Vercel, defina API_URL com o endereço da Vercel. */
function apiUrl() {
  const u = process.env.API_URL || '';
  return u ? u.replace(/\/$/, '') : siteUrl();
}

/** Libera chamadas vindas de outro domínio (site estático) para o cadastro. Retorna true se era preflight. */
function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  return false;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function paginaMsg(titulo, texto, ok = true) {
  const cor = ok ? '#39ff14' : '#ff6b6b';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(titulo)}</title></head>
<body style="margin:0;background:#170a33;color:#f6f0ff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px">
<div style="max-width:460px;text-align:center;background:#26104f;border:3px solid ${cor};border-radius:12px;padding:30px;box-shadow:6px 6px 0 #7a2cff">
<h1 style="color:${cor};font-size:26px;margin:0 0 12px">${esc(titulo)}</h1><p style="line-height:1.5">${esc(texto)}</p>
<p><a href="/" style="display:inline-block;margin-top:10px;background:#39ff14;color:#170a33;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">Voltar ao site</a></p></div></body></html>`;
}

module.exports = { json, page, ip, corpo, siteUrl, apiUrl, cors, esc, paginaMsg };
