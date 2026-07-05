const config = require('./config');
const positionTracker = require('./positionTracker');
const audioBridge = require('./audioBridge');
const channelManager = require('./channelManager');
const playerRegistry = require('./playerRegistry');
const { registerCommands, handleConnectCommand } = require('./commands');
const { startHealthServer } = require('./healthServer');

async function main() {
  console.log('=== Proximity Voice Bridge (mode salon auto, joueurs dynamiques) ===');

  startHealthServer(() => {
    const c = positionTracker.state.connectedTo;
    const d = positionTracker.state.distance;
    return c
      ? `OK - connecté à ${c.host}:${c.port} - distance=${Number.isFinite(d) ? d.toFixed(1) : '??'}m`
      : 'OK - en attente de connexion (/connect)';
  });

  positionTracker.start();

  const client1 = await audioBridge.loginBot(config.bot1.token);
  const client2 = await audioBridge.loginBot(config.bot2.token);

  const bot1 = { client: client1 };
  const bot2 = { client: client2 };
  const roleToBot = { player1: bot1, player2: bot2 };
  const roleToBotClientId = { player1: client1.user.id, player2: client2.user.id };

  const guild = await client1.guilds.fetch(config.guildId);
  // On force le cache complet du salon lobby pour récupérer sa catégorie parente
  await guild.channels.fetch();

  // Rafraîchit qui-est-qui (Discord <-> Minecraft) via Galaxium Bot (!joueurs),
  // en fond, pour les joueurs actuellement connectés
  playerRegistry.startAutoRefresh(client1);

  // Commande /connect (portée par le bot 1) pour définir l'IP/port du serveur
  // Minecraft à suivre directement depuis Discord
  await registerCommands(config.bot1.token, client1.user.id, config.guildId);
  handleConnectCommand(client1, (host, port) => {
    positionTracker.connectTo(host, port);
  });

  // Le 1er Discord qui rejoint le lobby devient player1, le 2ème player2
  // (voir roles.js). Chaque rôle est lié en dur à un bot (bot1 <-> player1,
  // bot2 <-> player2), mais QUI occupe ce rôle est entièrement dynamique.
  channelManager.setup(client1, config, config.guildId, roleToBotClientId, (role, channelId) => {
    const bot = roleToBot[role];
    console.log(`[main] ${role} -> salon ${channelId}, connexion du bot...`);
    audioBridge.connectOrMoveBot(bot, config.guildId, channelId);

    // Résolution immédiate du pseudo Minecraft pour ce nouvel arrivant
    // (pas besoin d'attendre le prochain rafraîchissement automatique)
    playerRegistry.refresh(client1).catch((e) =>
      console.error('[playerRegistry] Erreur de résolution immédiate :', e.message)
    );

    // Dès que les deux bots ont rejoint au moins une fois, on attache le pont
    // (chaque appel est idempotent, voir bridgeSpeaker dans audioBridge.js).
    // Le pont suit dynamiquement qui occupe chaque rôle, pas besoin de
    // connaître les 2 IDs à l'avance.
    if (bot1.connection && bot2.connection) {
      audioBridge.bridgeSpeaker(bot1, 'player1', bot2, audioBridge.computeGain, 'Joueur1 -> Joueur2');
      audioBridge.bridgeSpeaker(bot2, 'player2', bot1, audioBridge.computeGain, 'Joueur2 -> Joueur1');
    }
  });

  setInterval(() => {
    const d = positionTracker.state.distance;
    const g = audioBridge.computeGain();
    console.log(
      `[status] distance=${Number.isFinite(d) ? d.toFixed(1) : '??'}m  volume=${(g * 100).toFixed(0)}%`
    );
  }, 5000);
}

main().catch((err) => {
  console.error('[fatal] Erreur au démarrage :', err);
  process.exit(1);
});
