#!/usr/bin/env node
const { Client, GatewayIntentBits } = require('discord.js');

console.log('[debug] Démarrage du bot...');
console.log('[debug] BOT1_TOKEN présent ?', !!process.env.BOT1_TOKEN);
console.log('[debug] BOT2_TOKEN présent ?', !!process.env.BOT2_TOKEN);
console.log('[debug] GUILD_ID :', process.env.GUILD_ID);

const BOT1_TOKEN = process.env.BOT1_TOKEN;
const BOT2_TOKEN = process.env.BOT2_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!BOT1_TOKEN || !BOT2_TOKEN || !GUILD_ID) {
  console.error('[ERREUR] Tokens ou GUILD_ID manquants !');
  console.error('BOT1_TOKEN :', BOT1_TOKEN ? 'OK' : 'MANQUANT');
  console.error('BOT2_TOKEN :', BOT2_TOKEN ? 'OK' : 'MANQUANT');
  console.error('GUILD_ID :', GUILD_ID ? 'OK' : 'MANQUANT');
  process.exit(1);
}

const bot1 = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

bot1.on('ready', () => {
  console.log('[discord] Bot1 connecté comme :', bot1.user.username);
});

bot1.on('error', (err) => {
  console.error('[discord] Erreur bot1 :', err.message);
});

bot1.login(BOT1_TOKEN).catch((err) => {
  console.error('[discord] Échec login bot1 :', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('[debug] Après 15s, bot1 connecté ?', bot1.readyAt ? 'OUI' : 'NON');
  if (!bot1.readyAt) process.exit(1);
}, 15000);
