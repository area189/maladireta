const { neon } = require('@neondatabase/serverless');

let _sql = null;
let _pronto = null;

function sql() {
  if (!_sql) {
    // aceita DATABASE_URL ou as variáveis que a integração Neon da Vercel cria
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!url) throw new Error('Banco não configurado (DATABASE_URL / POSTGRES_URL)');
    _sql = neon(url);
  }
  return _sql;
}

/** Cria as tabelas na primeira chamada de cada instância. */
function init() {
  if (!_pronto) {
    const s = sql();
    _pronto = (async () => {
      await s`CREATE TABLE IF NOT EXISTS inscritos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        confirmado BOOLEAN NOT NULL DEFAULT false,
        ativo BOOLEAN NOT NULL DEFAULT true,
        token_confirmacao TEXT,
        token_saida TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
        confirmado_em TIMESTAMPTZ
      )`;
      await s`CREATE INDEX IF NOT EXISTS ix_insc_tok ON inscritos (token_confirmacao)`;
      await s`CREATE INDEX IF NOT EXISTS ix_insc_saida ON inscritos (token_saida)`;
      await s`CREATE TABLE IF NOT EXISTS campanhas (
        id SERIAL PRIMARY KEY,
        assunto TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        total INT NOT NULL,
        enviados INT NOT NULL DEFAULT 0,
        falhas INT NOT NULL DEFAULT 0,
        criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await s`CREATE TABLE IF NOT EXISTS tentativas (
        chave TEXT NOT NULL,
        ip TEXT NOT NULL,
        ts TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    })();
    _pronto.catch(() => { _pronto = null; });
  }
  return _pronto;
}

/** Limite de tentativas por IP (guardado no banco, pois funções não têm memória fixa). */
async function limite(chave, ip, max, janelaSeg) {
  const s = sql();
  await s`DELETE FROM tentativas WHERE ts < now() - interval '1 day'`;
  const r = await s`SELECT count(*)::int AS n FROM tentativas
    WHERE chave = ${chave} AND ip = ${ip} AND ts > now() - make_interval(secs => ${janelaSeg}::int)`;
  if (r[0].n >= max) return false;
  await s`INSERT INTO tentativas (chave, ip) VALUES (${chave}, ${ip})`;
  return true;
}

async function buscarPorEmail(email) {
  const r = await sql()`SELECT * FROM inscritos WHERE email = ${email}`;
  return r[0] || null;
}

async function salvarPendente({ nome, email, tokenConf, tokenSaida }) {
  await sql()`INSERT INTO inscritos (nome, email, token_confirmacao, token_saida)
    VALUES (${nome}, ${email}, ${tokenConf}, ${tokenSaida})
    ON CONFLICT (email) DO UPDATE
      SET nome = EXCLUDED.nome, confirmado = false, ativo = true,
          token_confirmacao = EXCLUDED.token_confirmacao`;
}

async function confirmarPorToken(token) {
  const r = await sql()`UPDATE inscritos
    SET confirmado = true, ativo = true, token_confirmacao = NULL, confirmado_em = now()
    WHERE token_confirmacao = ${token} RETURNING id`;
  return r.length > 0;
}

async function sairPorToken(token) {
  const r = await sql()`UPDATE inscritos SET ativo = false WHERE token_saida = ${token} RETURNING id`;
  return r.length > 0;
}

async function listar() {
  return sql()`SELECT id, nome, email, confirmado, ativo, criado_em, confirmado_em
    FROM inscritos ORDER BY id DESC LIMIT 20000`;
}

async function remover(id) {
  await sql()`DELETE FROM inscritos WHERE id = ${id}`;
}

async function contarConfirmados() {
  const r = await sql()`SELECT count(*)::int AS n FROM inscritos WHERE confirmado AND ativo`;
  return r[0].n;
}

async function proximosConfirmados(cursor, n) {
  return sql()`SELECT id, nome, email, token_saida FROM inscritos
    WHERE confirmado AND ativo AND id > ${cursor} ORDER BY id LIMIT ${n}`;
}

async function criarCampanha(assunto, mensagem, total) {
  const r = await sql()`INSERT INTO campanhas (assunto, mensagem, total)
    VALUES (${assunto}, ${mensagem}, ${total}) RETURNING *`;
  return r[0];
}

async function buscarCampanha(id) {
  const r = await sql()`SELECT * FROM campanhas WHERE id = ${id}`;
  return r[0] || null;
}

async function somarCampanha(id, enviados, falhas) {
  const r = await sql()`UPDATE campanhas SET enviados = enviados + ${enviados}, falhas = falhas + ${falhas}
    WHERE id = ${id} RETURNING *`;
  return r[0];
}

async function listarCampanhas() {
  return sql()`SELECT assunto, total, enviados, falhas, criada_em FROM campanhas ORDER BY id DESC LIMIT 10`;
}

module.exports = {
  init, limite, buscarPorEmail, salvarPendente, confirmarPorToken, sairPorToken, listar, remover,
  contarConfirmados, proximosConfirmados, criarCampanha, buscarCampanha, somarCampanha, listarCampanhas,
};
