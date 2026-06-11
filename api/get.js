// /api/get.js
// Lee un informe compartido desde Upstash Redis usando su slug.
// Se llama asi: /api/get?r=informe-dari-1-al-7-may-2026-a3k9
// Devuelve { data: {...} } o un error si no existe / vencio.

module.exports = async (req, res) => {
  try {
    var slug = (req.query && req.query.r) || '';
    if (Array.isArray(slug)) slug = slug[0];
    if (!slug) {
      res.status(400).json({ error: 'Falta el parametro r' });
      return;
    }

    var URL = process.env['SharedLinksDatabase_KV_REST_API_URL'] || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    var TOKEN = process.env['SharedLinksDatabase_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!URL || !TOKEN) {
      res.status(500).json({ error: 'DB no configurada' });
      return;
    }

    // Upstash REST: GET r:<slug>
    var r = await fetch(URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', 'r:' + slug])
    });
    var out = await r.json();
    if (!r.ok || (out && out.error)) {
      res.status(502).json({ error: (out && out.error) || 'Error leyendo' });
      return;
    }
    if (out.result == null) {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }

    var data;
    try { data = JSON.parse(out.result); } catch (e) { data = null; }
    if (!data) {
      res.status(404).json({ error: 'Dato invalido' });
      return;
    }

    // cache liviano en el navegador del que abre el link (5 min)
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json({ data: data });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
