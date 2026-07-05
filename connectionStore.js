const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '.last-connection.json');

function load() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.host === 'string' && typeof data.port === 'number') {
      return data;
    }
  } catch (e) {
    // pas de fichier, ou fichier invalide : pas grave, on repart de zéro
  }
  return null;
}

function save({ host, port }) {
  try {
    fs.writeFileSync(FILE, JSON.stringify({ host, port }, null, 2));
  } catch (e) {
    console.warn('[connectionStore] Impossible de sauvegarder la dernière connexion :', e.message);
  }
}

module.exports = { load, save };
