const config = require('./config');
const { fetchPlayerMap } = require('./galaxiumLookup');
const roles = require('./roles');

/**
 * Met à jour roles.roles[*].mcName pour chaque rôle actuellement occupé,
 * en interrogeant Galaxium Bot (!joueurs).
 */
async function refresh(client) {
  const activeRoles = roles.ROLE_ORDER.filter((r) => roles.roles[r].discordId);
  if (activeRoles.length === 0) {
    return; // personne connecté pour l'instant, rien à résoudre
  }

  const map = await fetchPlayerMap(client, config.playersChannelId);

  for (const role of activeRoles) {
    const discordId = roles.roles[role].discordId;
    const mcName = map.get(discordId);
    if (mcName) {
      roles.roles[role].mcName = mcName;
    } else {
      console.warn(
        `[playerRegistry] ${role} (<@${discordId}>) n'est pas encore lié via Galaxium Bot (!joueurs)`
      );
    }
  }

  console.log(
    `[playerRegistry] ${roles.ROLE_ORDER.map((r) => `${r}=${roles.roles[r].mcName || '??'}`).join('  ')}`
  );
}

/**
 * Rafraîchit toutes les `intervalMs` (par défaut 1 min) — court, car la
 * résolution ne se fait que pour des joueurs déjà connectés au lobby et on
 * veut qu'elle apparaisse vite après leur arrivée.
 */
function startAutoRefresh(client, intervalMs = 60 * 1000) {
  setInterval(() => {
    refresh(client).catch((e) => console.error('[playerRegistry] Erreur de rafraîchissement :', e.message));
  }, intervalMs);
}

module.exports = { refresh, startAutoRefresh };
