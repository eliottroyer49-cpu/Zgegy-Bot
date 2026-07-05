// Chaque ligne de la réponse de Galaxium Bot ressemble à :
//   <@123456789012345678> → CowComboYou
// (le "@Pseudo" affiché dans Discord est en réalité une mention brute
// <@id> une fois qu'on lit le contenu/l'embed du message côté code)
const LINE_REGEX = /<@!?(\d+)>\s*(?:→|->)\s*(\S+)/g;

/**
 * Envoie "!joueurs" dans le salon donné, attend la réponse de Galaxium Bot,
 * et retourne une Map<discordUserId, pseudoMinecraft>.
 */
async function fetchPlayerMap(client, channelId) {
  const channel = await client.channels.fetch(channelId);
  const sent = await channel.send('!joueurs');

  const collected = await channel
    .awaitMessages({
      filter: (m) => m.author.bot && m.id !== sent.id,
      max: 1,
      time: 8000,
    })
    .catch(() => null);

  if (!collected || collected.size === 0) {
    throw new Error(
      'Pas de réponse à "!joueurs" dans le salon configuré (vérifie que Galaxium Bot y répond, ' +
        'et que l\'intent "Message Content" est activé pour notre bot)'
    );
  }

  const reply = collected.first();
  const text = reply.embeds[0]?.description || reply.embeds[0]?.fields?.map((f) => f.value).join('\n') || reply.content || '';

  const map = new Map();
  let match;
  LINE_REGEX.lastIndex = 0;
  while ((match = LINE_REGEX.exec(text)) !== null) {
    const [, discordId, mcName] = match;
    map.set(discordId, mcName);
  }

  if (map.size === 0) {
    throw new Error(
      'Réponse reçue de Galaxium Bot mais aucune liaison n\'a pu être extraite ' +
        '(le format a peut-être changé, vérifie LINE_REGEX dans galaxiumLookup.js)'
    );
  }

  return map;
}

module.exports = { fetchPlayerMap };
