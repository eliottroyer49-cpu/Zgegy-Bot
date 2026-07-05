const http = require('http');

/**
 * Render (offre gratuite) exige que le service réponde à des requêtes HTTP
 * pour le considérer comme "en bonne santé". Ce petit serveur ne sert qu'à
 * ça : répondre 200 OK, avec un statut basique pour vérifier que tout tourne.
 * Un service externe (UptimeRobot) pingera cette URL pour empêcher la mise
 * en veille après 15 min d'inactivité HTTP.
 */
function startHealthServer(getStatusText) {
  const port = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    const text = getStatusText ? getStatusText() : 'OK';
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
  });

  server.listen(port, () => {
    console.log(`[health] Serveur HTTP de contrôle démarré sur le port ${port}`);
  });

  return server;
}

module.exports = { startHealthServer };
