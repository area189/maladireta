const db = require('../../lib/db');
const { exigirAdmin } = require('../../lib/auth');
const { json } = require('../../lib/http');

function celula(v) {
  if (v == null) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita injeção de fórmula no Excel
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { erro: 'Método não permitido.' });
  if (!exigirAdmin(req, res)) return;
  try {
    await db.init();
    const rows = (await db.listar()).reverse();
    const linhas = [['nome', 'email', 'confirmado', 'ativo', 'criado_em', 'confirmado_em']];
    for (const r of rows) {
      linhas.push([r.nome, r.email, r.confirmado ? 1 : 0, r.ativo ? 1 : 0, r.criado_em, r.confirmado_em]);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inscritos-newsletter.csv"');
    res.setHeader('Cache-Control', 'no-store');
    res.end('﻿' + linhas.map((l) => l.map(celula).join(',')).join('\n'));
  } catch (e) {
    console.error('exportar:', e);
    return json(res, 500, { erro: 'Erro ao exportar.' });
  }
};
