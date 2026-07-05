const { createJsClient } = require('./bedrockClientJs');
const { discoverLanWorlds } = require('./lanDiscovery');
const config = require('./config');
const store = require('./connectionStore');
const roles = require('./roles');

// État partagé, lu en temps réel par le mixeur audio
const state = {
  positions: {
    player1: null, // { x, y, z }
    player2: null,
  },
  distance: Infinity,
  connectedTo: null, // { host, port }
};

let currentClient = null;
let reconnectTimer = null;

function updateDistance() {
  const p1 = state.positions.player1;
  const p2 = state.positions.player2;
  if (!p1 || !p2) {
    state.distance = Infinity;
    return;
  }
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  state.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Retourne 'player1' | 'player2' | null selon le pseudo Minecraft actuellement
// résolu pour chacun (via roles.js, mis à jour dynamiquement par playerRegistry)
function roleForMcName(username) {
  if (roles.roles.player1.mcName && username === roles.roles.player1.mcName) return 'player1';
  if (roles.roles.player2.mcName && username === roles.roles.player2.mcName) return 'player2';
  return null;
}

async function resolveInitialHostAndPort() {
  const wantsAuto = !config.mc.host || config.mc.host === 'auto';

  if (!wantsAuto) {
    return { host: config.mc.host, port: config.mc.port };
  }

  // Pas de host fixe dans le .env : on regarde si une adresse a été donnée
  // via /connect lors d'une session précédente (survit à un redémarrage du script)
  const saved = store.load();
  if (saved) {
    console.log(`[position] Reprise de la dernière connexion connue : ${saved.host}:${saved.port}`);
    return saved;
  }

  console.log('[lanDiscovery] Recherche des mondes Bedrock sur le réseau local...');
  const worlds = await discoverLanWorlds();

  if (worlds.length === 0) {
    console.error(
      '[lanDiscovery] Aucun monde trouvé. Utilise la commande /connect dans Discord ' +
        'pour renseigner manuellement une adresse (utile pour un serveur Aternos par exemple).'
    );
    throw new Error('Aucun monde Bedrock détecté sur le réseau local');
  }

  let chosen = worlds[0];
  if (worlds.length > 1) {
    console.warn(`[lanDiscovery] ${worlds.length} mondes détectés sur le réseau :`);
    worlds.forEach((w) => console.warn(`  - ${w.name} (${w.host}:${w.portV4})`));

    if (config.mc.worldNameFilter) {
      const match = worlds.find((w) =>
        w.name?.toLowerCase().includes(config.mc.worldNameFilter.toLowerCase())
      );
      if (match) chosen = match;
    }
  }

  console.log(`[lanDiscovery] Monde choisi : ${chosen.name} (${chosen.host}:${chosen.portV4})`);
  return { host: chosen.host, port: chosen.portV4 };
}

/**
 * (Re)connecte le tracker de position à une adresse précise. Utilisé au
 * démarrage, et à chaque fois que la commande Discord /connect est utilisée.
 */
function connectTo(host, port) {
  // On coupe proprement toute connexion / tentative de reconnexion en cours
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (currentClient) {
    try {
      currentClient.removeAllListeners();
      currentClient.close?.();
    } catch (e) {
      // on ignore, le client précédent est de toute façon abandonné
    }
    currentClient = null;
  }

  // On réinitialise les positions connues, l'ancien serveur n'est plus valide
  state.positions.player1 = null;
  state.positions.player2 = null;
  state.distance = Infinity;
  state.connectedTo = { host, port };
  store.save({ host, port });

  console.log(`[position] Connexion à ${host}:${port}...`);

  const runtimeIdToRole = new Map();

  const client = createJsClient({
    host,
    port,
    skipPing: true, // on connaît déjà l'adresse exacte, pas besoin de ping préalable
    username: 'ProximityTracker',
    offline: true, // mets false si le serveur exige un compte Xbox (rare sur Aternos/LAN perso)
  });
  currentClient = client;

  client.on('join', () => {
    console.log(`[position] Connecté à ${host}:${port}, suivi des positions en cours...`);
  });

  client.on('add_player', (packet) => {
    const role = roleForMcName(packet.username);
    if (role) {
      runtimeIdToRole.set(String(packet.runtime_id), role);
      state.positions[role] = {
        x: packet.position.x,
        y: packet.position.y,
        z: packet.position.z,
      };
      updateDistance();
    }
  });

  client.on('move_player', (packet) => {
    const role = runtimeIdToRole.get(String(packet.runtime_id));
    if (role) {
      state.positions[role] = {
        x: packet.position.x,
        y: packet.position.y,
        z: packet.position.z,
      };
      updateDistance();
    }
  });

  client.on('remove_entity', (packet) => {
    const key = String(packet.runtime_entity_id ?? packet.entity_id_self);
    const role = runtimeIdToRole.get(key);
    if (role) {
      state.positions[role] = null;
      runtimeIdToRole.delete(key);
      updateDistance();
    }
  });

  // Debug : décommente pour voir tous les paquets reçus si le suivi ne marche pas
  // client.on('packet', (packet) => console.log(packet.data.name));

  client.on('error', (err) => {
    console.error('[position] Erreur de connexion Bedrock :', err.message);
  });

  client.on('disconnect', (packet) => {
    console.warn(`[position] Déconnecté de ${host}:${port}, reconnexion dans 5s...`, packet);
    reconnectTimer = setTimeout(() => connectTo(host, port), 5000);
  });

  return client;
}

async function start() {
  console.log('[position] Démarrage du suivi de position...');

  let host, port;
  try {
    ({ host, port } = await resolveInitialHostAndPort());
  } catch (err) {
    console.error(
      '[position] Aucune adresse disponible pour le moment. ' +
        'En attente de la commande /connect côté Discord...'
    );
    return; // on ne boucle pas indéfiniment : /connect prendra le relais
  }

  connectTo(host, port);
}

module.exports = { start, connectTo, state };
