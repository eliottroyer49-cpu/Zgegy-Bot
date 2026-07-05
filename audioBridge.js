const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  EndBehaviorType,
} = require('@discordjs/voice');
const prism = require('prism-media');
const config = require('./config');
const GainTransform = require('./gainTransform');
const { state: positionState } = require('./positionTracker');
const roles = require('./roles');

const OPUS_OPTS = { rate: 48000, channels: 2, frameSize: 960 };

function computeGain() {
  const d = positionState.distance;
  if (d <= config.minRange) return 1;
  if (d >= config.maxRange) return 0;
  return 1 - (d - config.minRange) / (config.maxRange - config.minRange);
}

async function loginBot(token) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers, // nécessaire pour déplacer/lister les membres des salons temporaires
      GatewayIntentBits.GuildMessages, // pour envoyer/lire "!joueurs" et la réponse de Galaxium Bot
      GatewayIntentBits.MessageContent, // pour lire le contenu/l'embed de la réponse (intent privilégié à activer)
    ],
  });
  await client.login(token);
  await new Promise((resolve) => client.once('ready', resolve));
  console.log(`[discord] ${client.user.tag} connecté.`);
  return client;
}

/**
 * Connecte le bot au salon donné (première fois), ou le déplace s'il y est déjà.
 * `bot` est un objet mutable { client, connection, player } réutilisé partout.
 */
function connectOrMoveBot(bot, guildId, channelId) {
  const adapterCreator = bot.client.guilds.cache.get(guildId).voiceAdapterCreator;

  bot.connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  if (!bot.player) {
    bot.player = createAudioPlayer();
  }
  bot.connection.subscribe(bot.player);
}

/**
 * Attache le pont audio pour un rôle : quand la personne qui occupe
 * actuellement `sourceRole` (voir roles.js, ça peut changer dans le temps)
 * parle dans le salon de `sourceBot`, on renvoie (atténué) vers `targetBot`.
 * L'attachement ne se fait qu'une fois par bot (idempotent), et vérifie
 * l'occupant du rôle à CHAQUE prise de parole plutôt qu'un ID figé, pour
 * bien suivre les changements de joueur (déconnexion/reconnexion).
 */
function bridgeSpeaker(sourceBot, sourceRole, targetBot, getGain, label) {
  if (sourceBot._bridgedRole === sourceRole) return; // déjà attaché pour ce rôle
  sourceBot._bridgedRole = sourceRole;

  sourceBot.connection.receiver.speaking.on('start', (userId) => {
    const currentOccupant = roles.roles[sourceRole].discordId;
    if (!currentOccupant || userId !== currentOccupant) return;
    if (!targetBot.player) {
      console.log(`[audio] ${label} : cible pas encore connectée, son ignoré`);
      return;
    }

    const opusStream = sourceBot.connection.receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.Manual },
    });

    const decoder = new prism.opus.Decoder(OPUS_OPTS);
    const gain = new GainTransform(getGain);
    const encoder = new prism.opus.Encoder(OPUS_OPTS);
    const pipeline = opusStream.pipe(decoder).pipe(gain).pipe(encoder);

    const resource = createAudioResource(pipeline, { inputType: StreamType.Opus });
    targetBot.player.play(resource);

    opusStream.on('error', (e) => console.error(`[audio] ${label} erreur stream:`, e.message));
  });
}

module.exports = { loginBot, connectOrMoveBot, bridgeSpeaker, computeGain };
