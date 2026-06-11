// /api/save.js
// Guarda un informe compartido en Upstash Redis y devuelve un "slug" legible.
// El slug es lo que va en el link: /?r=informe-dari-1-al-7-may-2026-a3k9
// No usa ninguna libreria: habla con Upstash por su API REST (fetch).

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    // El body llega parseado por Vercel cuando el Content-Type es JSON.
    var data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { data = null; }
    }
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'No data' });
      return;
    }

    // Credenciales que Vercel inyecto solo al instalar Upstash.
    var URL = process.env['SharedLinksDatabase_KV_REST_API_URL'] || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    var TOKEN = process.env['SharedLinksDatabase_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!URL || !TOKEN) {
      res.status(500).json({ error: 'DB no configurada' });
      return;
    }

    var slug = buildSlug(data);
    var TTL = 60 * 60 * 24 * 365; // los links vencen al ano (en segundos)

    // Upstash REST: POST a la URL con el comando como array JSON en el body.
    // SET r:<slug> <json> EX <ttl>
    var r = await fetch(URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', 'r:' + slug, JSON.stringify(data), 'EX', String(TTL)])
    });
    var out = await r.json();
    if (!r.ok || (out && out.error)) {
      res.status(502).json({ error: (out && out.error) || 'Error guardando' });
      return;
    }

    res.status(200).json({ slug: slug });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};

// Arma un slug legible: informe-<nombre>-<rango de fechas>-<4 al azar>
// El sufijo al azar es para que dos personas que comparten la misma semana no se pisen.
function buildSlug(data) {
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function clean(s) {
    return (s || '').toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca acentos
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  }
  function parse(s) {
    var p = (s || '').split('-');
    return (p.length === 3) ? { y: +p[0], m: +p[1], d: +p[2] } : null;
  }
  var f = parse(data.f), t = parse(data.t), fecha = '';
  if (f && t) {
    if (f.y === t.y && f.m === t.m && f.d === t.d) fecha = f.d + '-' + MES[f.m - 1] + '-' + f.y;
    else if (f.y === t.y && f.m === t.m) fecha = f.d + '-al-' + t.d + '-' + MES[t.m - 1] + '-' + t.y;
    else if (f.y === t.y) fecha = f.d + '-' + MES[f.m - 1] + '-al-' + t.d + '-' + MES[t.m - 1] + '-' + t.y;
    else fecha = f.d + '-' + MES[f.m - 1] + '-' + f.y + '-al-' + t.d + '-' + MES[t.m - 1] + '-' + t.y;
  }
  var nombre = clean(data.n);
  var rand = Math.random().toString(36).slice(2, 6);
  var slug = 'informe' + (nombre ? '-' + nombre : '') + (fecha ? '-' + fecha : '') + '-' + rand;
  return slug.replace(/-+/g, '-');
}
