require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[config] Variable manquante dans .env : ${name}`);
    process.exit(1);
  }
  return v;
}

module.exports = {
  bot1: {
    token: required('BOT1_TOKEN'),
  },
  bot2: {
    token: required('BOT2_TOKEN'),
  },
  guildId: required('GUILD_ID'),
  // Salon dans lequel un joueur doit se connecter pour déclencher
  // la création automatique de son salon vocal personnel
  lobbyChannelId: process.env.LOBBY_CHANNEL_ID || '1521577054036951150',
  // Salon où taper "!joueurs" pour interroger Galaxium Bot (liaison Discord <-> Minecraft)
  playersChannelId: process.env.PLAYERS_CHANNEL_ID || '1521492585393160222',
  // Nombre max de joueurs suivis simultanément (limité par le nombre de bots)
  maxPlayers: 2,
  mc: {
    // Laisse vide (ou mets "auto") pour détecter automatiquement le monde
    // LAN sur le réseau local. Renseigne une IP pour forcer une connexion
    // directe (utile si la détection auto échoue, ex: pare-feu strict).
    host: process.env.MC_HOST || 'auto',
    port: parseInt(process.env.MC_PORT || '19132', 10),
    // Optionnel : si plusieurs mondes LAN tournent sur le réseau, précise
    // un bout du nom du monde pour choisir le bon automatiquement.
    worldNameFilter: process.env.MC_WORLD_NAME || null,
  },
  minRange: parseFloat(process.env.MIN_RANGE || '5'),
  maxRange: parseFloat(process.env.MAX_RANGE || '40'),
};
