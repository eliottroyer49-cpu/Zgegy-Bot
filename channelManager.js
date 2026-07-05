const { ChannelType, PermissionsBitField } = require('discord.js');
const roles = require('./roles');

// discordUserId -> { channelId }
const activeChannels = new Map();

/**
 * Écoute les connexions au salon "lobby". Le premier Discord à s'y
 * connecter devient "player1", le deuxième "player2" (voir roles.js).
 * Un salon vocal privé est créé et attribué automatiquement.
 *
 * `roleToBotClientId` : { player1: idDuBot1, player2: idDuBot2 } — sert à
 * donner au bon bot la permission de rejoindre le salon perso créé.
 */
function setup(client, config, guildId, roleToBotClientId, onPlayerChannelReady) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      const userId = newState.id;

      if (newState.channelId === config.lobbyChannelId) {
        await handleJoinLobby(newState.guild, userId, config, roleToBotClientId, onPlayerChannelReady);
      }

      // Si quelqu'un a quitté un salon qu'on a créé, on vérifie s'il est vide
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        await cleanupIfEmpty(oldState.guild, oldState.channelId);
      }
    } catch (err) {
      console.error('[channelManager] Erreur voiceStateUpdate :', err);
    }
  });

  console.log(`[channelManager] En écoute sur le salon lobby ${config.lobbyChannelId}`);
}

async function handleJoinLobby(guild, userId, config, roleToBotClientId, onPlayerChannelReady) {
  const existingEntry = activeChannels.get(userId);

  if (existingEntry && guild.channels.cache.has(existingEntry.channelId)) {
    // Déjà un salon perso actif -> on le renvoie dedans (pas de nouvelle attribution)
    await moveMember(guild, userId, existingEntry.channelId);
    onPlayerChannelReady(roles.roleOf(userId), existingEntry.channelId);
    return;
  }

  const role = roles.assign(userId);
  if (!role) {
    console.warn(
      `[channelManager] <@${userId}> a rejoint le lobby mais les ${roles.ROLE_ORDER.length} ` +
        'places sont déjà prises (limité par le nombre de bots disponibles).'
    );
    return;
  }

  const botClientId = roleToBotClientId[role];

  const lobby = guild.channels.cache.get(config.lobbyChannelId);
  const parentId = lobby ? lobby.parentId : undefined;

  // Pseudo Discord en direct pour nommer le salon
  const member = await guild.members.fetch(userId);
  const label = member.displayName || member.user.username;

  const channel = await guild.channels.create({
    name: `🎙️ Voix - ${label}`,
    type: ChannelType.GuildVoice,
    parent: parentId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: userId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.UseVAD,
        ],
      },
      {
        id: botClientId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.UseVAD,
        ],
      },
    ],
  });

  activeChannels.set(userId, { channelId: channel.id });
  console.log(`[channelManager] Salon créé pour ${role} : ${channel.name} (${channel.id})`);

  await moveMember(guild, userId, channel.id);
  onPlayerChannelReady(role, channel.id);
}

async function moveMember(guild, userId, channelId) {
  const member = await guild.members.fetch(userId);
  if (member.voice.channelId !== channelId) {
    await member.voice.setChannel(channelId).catch((e) => {
      console.error('[channelManager] Impossible de déplacer le membre :', e.message);
    });
  }
}

async function cleanupIfEmpty(guild, channelId) {
  // On ne touche qu'aux salons qu'on a nous-mêmes créés (jamais au lobby)
  const entry = [...activeChannels.entries()].find(([, v]) => v.channelId === channelId);
  if (!entry) return;
  const [ownerId] = entry;

  setTimeout(async () => {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const humanMembers = channel.members.filter((m) => !m.user.bot);
    if (humanMembers.size === 0) {
      await channel.delete().catch(() => {});
      activeChannels.delete(ownerId);
      roles.release(ownerId); // le slot redevient disponible pour le prochain arrivant
      console.log(`[channelManager] Salon temporaire supprimé : ${channel.name}`);
    }
  }, 10_000); // 10s de grâce, au cas où le joueur revient vite
}

module.exports = { setup };
