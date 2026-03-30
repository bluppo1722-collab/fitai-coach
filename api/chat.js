const https = require('https');
 
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
 
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY mancante nelle variabili ambiente Vercel' });
    return;
  }
 
  var bodyStr = '';
  req.on('data', function(chunk) { bodyStr += chunk.toString(); });
  req.on('end', function() {
    var body;
    try { body = JSON.parse(bodyStr); } catch(e) {
      res.status(400).json({ error: 'JSON non valido: ' + e.message });
      return;
    }
 
    var payload = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: body.max_tokens || 1000,
      system: body.system || '',
      messages: body.messages || []
    });
 
    var options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    };
 
    var apiReq = https.request(options, function(apiRes) {
      var data = '';
      apiRes.on('data', function(chunk) { data += chunk; });
      apiRes.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          // If Anthropic returned an error, pass it through clearly
          if (parsed.error) {
            res.status(apiRes.statusCode).json({
              error: 'Errore Anthropic: ' + parsed.error.message + ' (tipo: ' + parsed.error.type + ')'
            });
            return;
          }
          res.status(apiRes.statusCode).json(parsed);
        } catch(e) {
          res.status(500).json({ error: 'Risposta non valida da Anthropic: ' + data.slice(0, 300) });
        }
      });
    });
 
    apiReq.on('error', function(e) {
      res.status(500).json({ error: 'Errore connessione Anthropic: ' + e.message });
    });
 
    apiReq.write(payload);
    apiReq.end();
  });
};
