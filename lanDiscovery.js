// Bedrock diffuse un "ping" en broadcast UDP sur le port 19132 pour que les
// autres appareils du réseau puissent découvrir les mondes ouverts en LAN
// sans avoir à taper une IP (c'est ce qui remplit l'onglet "Amis" du jeu).
// On reproduit ce mécanisme ici pour trouver l'IP (et le vrai port de jeu)
// automatiquement.

const dgram = require('dgram');
const UnconnectedPing = require('jsp-raknet/js/protocol/UnconnectedPing').default;
const UnconnectedPong = require('jsp-raknet/js/protocol/UnconnectedPong').default;

/**
 * Le MOTD renvoyé par le serveur est une chaîne à champs séparés par ';' :
 * MCPE;nom du monde;protocole;version;joueurs;maxJoueurs;id;sous-nom;gamemode;gamemodeNum;portV4;portV6;
 */
function parseMotd(motd) {
  const parts = motd.split(';');
  return {
    name: parts[1] || 'Monde inconnu',
    version: parts[3],
    players: parseInt(parts[4], 10),
    maxPlayers: parseInt(parts[5], 10),
    portV4: parseInt(parts[10], 10),
  };
}

/**
 * Envoie un ping en broadcast sur le réseau local et écoute les réponses
 * des mondes Bedrock ouverts en LAN pendant `timeoutMs`.
 * Retourne la liste des mondes trouvés : [{ host, name, portV4, players, maxPlayers }]
 */
function discoverLanWorlds({ port = 19132, timeoutMs = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const found = new Map(); // ip -> monde parsé

    socket.on('error', (err) => {
      socket.close();
      reject(err);
    });

    socket.on('message', (msg, rinfo) => {
      try {
        const pong = new UnconnectedPong(msg);
        pong.decode();
        if (!pong.isValid()) return;
        if (found.has(rinfo.address)) return;

        const parsed = parseMotd(pong.serverName);
        const world = { host: rinfo.address, ...parsed };
        found.set(rinfo.address, world);
        console.log(`[lanDiscovery] Monde trouvé : "${world.name}" sur ${world.host}:${world.portV4}`);
      } catch (e) {
        // Paquet qui ne ressemble pas à un pong Bedrock valide, on ignore
      }
    });

    socket.bind(0, () => {
      socket.setBroadcast(true);

      const ping = new UnconnectedPing();
      ping.sendTimestamp = BigInt(Date.now());
      ping.clientGUID = BigInt(Math.floor(Math.random() * 1_000_000_000));
      ping.encode();
      const buffer = ping.getBuffer();

      const sendPing = () => socket.send(buffer, port, '255.255.255.255');
      sendPing();
      const interval = setInterval(sendPing, 1000); // au cas où le 1er paquet se perde

      setTimeout(() => {
        clearInterval(interval);
        socket.close();
        resolve([...found.values()]);
      }, timeoutMs);
    });
  });
}

module.exports = { discoverLanWorlds };
