const mail = require('../lib/mail');
const { json } = require('../lib/http');

// Diagnóstico: abra /api/saude para ver se o backend está no ar e o que falta configurar (só mostra sim/não).
module.exports = async (req, res) => {
  const out = {
    api_no_ar: true,
    banco_configurado: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING),
    gmail_configurado: mail.configurado(),
    admin_password: !!process.env.ADMIN_PASSWORD,
    session_secret: !!process.env.SESSION_SECRET,
    site_url: !!(process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL),
  };
  if (req.query && req.query.smtp === '1' && out.gmail_configurado) out.teste_gmail = await mail.testar();
  return json(res, 200, out);
};
