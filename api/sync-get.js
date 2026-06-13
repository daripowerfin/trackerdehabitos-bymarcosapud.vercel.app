// /api/sync-get.js
// Lee el progreso guardado usando el CODIGO CORTO de 6 caracteres.
// Se llama asi: /api/sync-get?code=K4T9M2
// Devuelve { data: {...} } o un error si no existe / vencio.

module.exports = async (req, res) => {
  try {
    var code = (req.query && (req.query.code || req.query.c)) || '';
    if (Array.isArray(code)) code = code[0];
    code = (code || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) {
      res.status(400).json({ error: 'Falta el codigo' });
      return;
    }

    var URL = process.env['SharedLinksDatabase_KV_REST_API_URL'] || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    var TOKEN = process.env['SharedLinksDatabase_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!URL || !TOKEN) {
      res.status(500).json({ error: 'DB no configurada' });
      return;
    }

    var r = await fetch(URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', 'sync:' + code])
    });
    var out = await r.json();
    if (!r.ok || (out && out.error)) {
      res.status(502).json({ error: (out && out.error) || 'Error leyendo' });
      return;
    }
    if (out.result == null) {
      res.status(404).json({ error: 'Codigo no encontrado o vencido' });
      return;
    }

    var data;
    try { data = JSON.parse(out.result); } catch (e) { data = null; }
    if (!data) {
      res.status(404).json({ error: 'Dato invalido' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ data: data });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
