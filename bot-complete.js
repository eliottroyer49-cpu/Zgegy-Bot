#!/usr/bin/env node
/**
 * Bot Discord complet pour Render
 * 
 * Reçoit les positions du tracker via HTTP, calcule le gain, applique au son.
 */

const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const prism = require('prism-media');
const http = require('http');

const BOT1_TOKEN = process.env.BOT1_TOKEN || '';
const BOT2_TOKEN = process.env.BOT2_TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '';
const LOBBY_CHANNEL_ID = process.env.LOBBY_CHANNEL_ID || '1521577054036951150';

if (!BOT1_TOKEN || !BOT2_TOKEN || !GUILD_ID) {
  console.error('Erreur : BOT1_TOKEN, BOT2_TOKEN, GUILD_ID manquants');
  process.exit(1);
}

const MIN_RANGE = parseFloat(process.env.MIN_RANGE || '5');
const MAX_RANGE = parseFloat(process.env.MAX_RANGE || '40');

// État
const positionState = {
  distance: Infinity,
};

const roles = {
  player1: { discordId: null },
  player2: { discordId: null },
};

const activeChannels = new Map();
let bot1, bot2;

function computeGain() {
  const d = positionState.distance;
  if (d <= MIN_RANGE) return 1.0; // volume max
  if (d >= MAX_RANGE) return 0.0; // silence
  return 1.0 - (d - MIN_RANGE) / (MAX_RANGE - MIN_RANGE); // falloff linéaire
}

// Serveur HTTP
function startHttpServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/positions') {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(data);
          positionState.distance = payload.distance || Infinity;
          res.writeHead(200);
          res.end('OK');
        } catch (e) {
          res.writeHead(400);
          res.end('Bad JSON');
        }
      });
    } else {
      const d = positionState.distance;
      const g = computeGain();
      const text = `OK - distance=${Number.isFinite(d) ? d.toFixed(1) : '??'}m volume=${(g*100).toFixed(0)}%`;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(text);
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`[health] Serveur HTTP port ${port}`);
  });
}

async function loginBots() {
  bot1 = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  bot2 = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
  });

  await bot1.login(BOT1_TOKEN);
  await bot2.login(BOT2_TOKEN);

  console.log(`[discord] ${bot1.user.username} connecté`);
  console.log(`[discord] ${bot2.user.username} connecté`);
}

function setupChannelManager(client, botId) {
  const bots = { [bot1.user.id]: bot1, [bot2.user.id]: bot2 };
  
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      const userId = newState.id;

      if (newState.channelId === LOBBY_CHANNEL_ID) {
        const guild = newState.guild;
        let role = null;
        
        // Assigne les rôles : premier arrivé = player1, 2ème = player2
        if (!roles.player1.discordId) {
          role = 'player1';
          roles.player1.discordId = userId;
        } else if (!roles.player2.discordId && roles.player1.discordId !== userId) {
          role = 'player2';
          roles.player2.discordId = userId;
        }

        if (role) {
          const member = await guild.members.fetch(userId);
          const label = member.displayName || member.user.username;
          const lobby = guild.channels.cache.get(LOBBY_CHANNEL_ID);
          
          const channel = await guild.channels.create({
            name: `🎙️ Voix - ${label}`,
            type: ChannelType.GuildVoice,
            parent: lobby?.parentId,
            permissionOverwrites: [
              { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
              { id: botId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
            ],
          });

          activeChannels.set(userId, { channelId: channel.id, role });
          await member.voice.setChannel(channel.id);
          console.log(`[channels] ${role} -> ${channel.name}`);
        }
      }

      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const entry = activeChannels.get(oldState.id);
        if (entry) {
          setTimeout(async () => {
            const ch = oldState.guild.channels.cache.get(entry.channelId);
            if (ch && ch.members.filter(m => !m.user.bot).size === 0) {
              await ch.delete();
              activeChannels.delete(oldState.id);
              if (entry.role === 'player1') roles.player1.discordId = null;
              if (entry.role === 'player2') roles.player2.discordId = null;
              console.log(`[channels] Salon supprimé`);
            }
          }, 10000);
        }
      }
    } catch (err) {
      console.error('[channelManager] Erreur :', err.message);
    }
  });
}

function setupAudioBridge(sourceBot, targetBot, sourceRole) {
  if (!sourceBot.connection) return;
  
  sourceBot.connection.receiver.speaking.on('start', (userId) => {
    const occupant = sourceRole === 'player1' ? roles.player1.discordId : roles.player2.discordId;
    if (!occupant || userId !== occupant) return;
    if (!targetBot.player) return;

    const opusStream = sourceBot.connection.receiver.subscribe(userId, { end: { behavior: 1 } });
    const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
    
    // Applique le gain basé sur la distance
    const gainStream = decoder.pipe(
      new (require('stream').Transform)({
        transform(chunk, encoding, callback) {
          const gain = computeGain();
          const pcm = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2);
          for (let i = 0; i < pcm.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, pcm[i] * gain));
          }
          callback(null, Buffer.from(pcm.buffer));
        },
      })
    );

    const encoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
    const pipeline = opusStream.pipe(decoder).pipe(gainStream).pipe(encoder);
    const resource = createAudioResource(pipeline, { inputType: StreamType.Opus });
    targetBot.player.play(resource);
  });
}

async function connectBotToChannel(bot, guildId, channelId) {
  const guild = await bot.guilds.fetch(guildId);
  const channel = guild.channels.cache.get(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  const connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
  });

  bot.connection = connection;
  bot.player = createAudioPlayer();
  connection.subscribe(bot.player);

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log(`[audio] Bot connecté au salon`);
  });

  connection.on('error', (error) => {
    console.error('[audio] Erreur connexion :', error.message);
  });
}

async function main() {
  console.log('=== Bot Discord (positions via HTTP) ===');
  
  startHttpServer();
  await loginBots();

  setupChannelManager(bot1, bot1.user.id);
  
  // Quand un joueur rejoint, connecte le bot correspondant
  bot1.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId && newState.channelId !== LOBBY_CHANNEL_ID) {
      const entry = activeChannels.get(newState.id);
      if (entry?.role === 'player1') {
        await connectBotToChannel(bot1, GUILD_ID, entry.channelId);
        if (bot1.connection && bot2.connection) {
          setupAudioBridge(bot1, bot2, 'player1');
          setupAudioBridge(bot2, bot1, 'player2');
        }
      }
    }
  });

  bot2.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId && newState.channelId !== LOBBY_CHANNEL_ID) {
      const entry = activeChannels.get(newState.id);
      if (entry?.role === 'player2') {
        await connectBotToChannel(bot2, GUILD_ID, entry.channelId);
        if (bot1.connection && bot2.connection) {
          setupAudioBridge(bot1, bot2, 'player1');
          setupAudioBridge(bot2, bot1, 'player2');
        }
      }
    }
  });

  setInterval(() => {
    const d = positionState.distance;
    const g = computeGain();
    console.log(`[status] distance=${Number.isFinite(d) ? d.toFixed(1) : '??'}m volume=${(g*100).toFixed(0)}%`);
  }, 5000);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
