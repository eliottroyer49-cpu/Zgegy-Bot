const {
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
} = require('discord.js');

const connectCommand = new SlashCommandBuilder()
  .setName('connect')
  .setDescription('Définit le serveur Minecraft Bedrock à suivre (IP + port)')
  .addStringOption((opt) =>
    opt.setName('ip').setDescription('Adresse du serveur, ex: monserveur.aternos.me').setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName('port').setDescription('Port du serveur, ex: 19132').setRequired(true)
  )
  // Par défaut, seuls les membres avec la permission "Gérer le serveur" voient/utilisent la commande
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .toJSON();

/**
 * Enregistre la commande /connect sur UN serveur précis (guild command),
 * ce qui la rend disponible quasi instantanément (contrairement aux
 * commandes globales qui peuvent prendre jusqu'à 1h à apparaître).
 */
async function registerCommands(token, clientId, guildId) {
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: [connectCommand],
  });
  console.log('[commands] /connect enregistrée sur le serveur Discord.');
}

/**
 * Branche l'écoute de la commande /connect sur un client Discord.
 * `onConnect(host, port)` est appelé avec les valeurs saisies par l'utilisateur.
 */
function handleConnectCommand(client, onConnect) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'connect') return;

    const host = interaction.options.getString('ip', true).trim();
    const port = interaction.options.getInteger('port', true);

    if (port < 1 || port > 65535) {
      await interaction.reply({ content: `Port invalide : ${port}`, ephemeral: true });
      return;
    }

    await interaction.reply(`🔌 Connexion au serveur Minecraft \`${host}:${port}\` en cours...`);

    try {
      onConnect(host, port);
    } catch (err) {
      console.error('[commands] Erreur pendant /connect :', err);
      await interaction.followUp({
        content: `❌ Erreur lors de la connexion : ${err.message}`,
        ephemeral: true,
      });
    }
  });
}

module.exports = { registerCommands, handleConnectCommand };
