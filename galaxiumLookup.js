// Chaque ligne de la réponse de Galaxium Bot ressemble à :
//   <@123456789012345678> → CowComboYou
// (le "@Pseudo" affiché dans Discord est en réalité une mention brute
// <@id> une fois qu'on lit le contenu/l'embed du message côté code)
const LINE_REGEX = /<@!?(\d+)>\s*(?:→|->)\s*(\S+)/g;

function extractMap(text) {
  const map = new Map();
  if (!text) return map;
  const re = new RegExp(LINE_REGEX); // instance fraîche, évite les soucis de lastIndex partagé
  let match;
  while ((match = re.exec(text)) !== null) {
    map.set(match[1], match[2]);
  }
  return map;
}

/**
 * Galaxium Bot ignore les messages envoyés par d'autres bots (comportement
 * standard anti-boucle), donc notre bot ne peut pas déclencher lui-même la
 * commande "!joueurs". À la place, on relit l'historique récent du salon
 * pour retrouver la DERNIÈRE réponse que Galaxium Bot a donnée à un humain,
 * et on la parse directement.
 *
 * Implication : la liste ne se met à jour que quand quelqu'un tape
 * "!joueurs" à la main de temps en temps (par exemple juste après s'être
 * lié, ou avant une session de jeu).
 */
async function fetchPlayerMap(client, channelId) {
  const channel = await client.channels.fetch(channelId);
  const messages = await channel.messages.fetch({ limit: 50 });

  for (const message of messages.values()) {
    if (!message.author.bot) continue; // on cherche une réponse de bot (Galaxium Bot), pas une commande humaine

    const text =
      message.embeds[0]?.description ||
      message.embeds[0]?.fields?.map((f) => f.value).join('\n') ||
      message.content ||
      '';

    const map = extractMap(text);
    if (map.size > 0) {
      return map;
    }
  }

  throw new Error(
    'Aucune réponse "!joueurs" récente trouvée dans ce salon. Comme Galaxium Bot ignore les ' +
      "messages des autres bots, quelqu'un doit taper !joueurs à la main pour rafraîchir la liste."
  );
}

module.exports = { fetchPlayerMap };
