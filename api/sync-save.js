// /api/sync-save.js
// Guarda una copia del progreso completo de un usuario en Upstash Redis
// y devuelve un CODIGO CORTO (ej: K4T9M2) para transferirlo a otro dispositivo.
// El codigo vence a las 48 horas. No usa ninguna libreria: habla con Upstash por su API REST.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    var data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { data = null; }
    }
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'No data' });
      return;
    }

    var URL = process.env['SharedLinksDatabase_KV_REST_API_URL'] || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    var TOKEN = process.env['SharedLinksDatabase_KV_REST_API_TOKEN'] || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!URL || !TOKEN) {
      res.status(500).json({ error: 'DB no configurada' });
      return;
    }

    // Codigo de 6 caracteres sin caracteres confusos (sin 0/O, 1/I/L).
    var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    function makeCode() {
      var s = '';
      for (var i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      return s;
    }

    var TTL = 60 * 60 * 48; // 48 horas en segundos
    var code = '';
    var saved = false;

    // Intentar hasta 5 veces conseguir un codigo libre (SET con NX = solo si no existe).
    for (var intento = 0; intento < 5 && !saved; intento++) {
      code = makeCode();
      var r = await fetch(URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', 'sync:' + code, JSON.stringify(data), 'EX', String(TTL), 'NX'])
      });
      var out = await r.json();
      if (r.ok && out && out.result === 'OK') { saved = true; break; }
    }

    if (!saved) {
      res.status(502).json({ error: 'No se pudo generar el codigo, reintenta' });
      return;
    }

    res.status(200).json({ code: code });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
