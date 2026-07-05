const ROLE_ORDER = ['player1', 'player2'];

// role -> { discordId, mcName } | { discordId: null, mcName: null }
const roles = {
  player1: { discordId: null, mcName: null },
  player2: { discordId: null, mcName: null },
};

/**
 * Attribue un rôle à ce discordId :
 * - s'il a déjà un rôle (reconnexion), on le lui redonne
 * - sinon on lui donne le premier slot libre (=premier arrivé, premier servi)
 * - si tout est déjà pris par quelqu'un d'autre, retourne null
 */
function assign(discordId) {
  for (const role of ROLE_ORDER) {
    if (roles[role].discordId === discordId) return role;
  }
  for (const role of ROLE_ORDER) {
    if (!roles[role].discordId) {
      roles[role].discordId = discordId;
      console.log(`[roles] ${role} attribué à <@${discordId}> (premier arrivé sur ce slot)`);
      return role;
    }
  }
  return null; // complet (déjà 2 joueurs actifs, avec 2 bots)
}

/**
 * Libère le rôle occupé par ce discordId (ex: quand son salon perso est
 * supprimé car vide) pour que le slot redevienne disponible.
 */
function release(discordId) {
  for (const role of ROLE_ORDER) {
    if (roles[role].discordId === discordId) {
      console.log(`[roles] ${role} libéré (<@${discordId}> parti)`);
      roles[role].discordId = null;
      roles[role].mcName = null;
      return role;
    }
  }
  return null;
}

function roleOf(discordId) {
  for (const role of ROLE_ORDER) {
    if (roles[role].discordId === discordId) return role;
  }
  return null;
}

module.exports = { roles, assign, release, roleOf, ROLE_ORDER };
