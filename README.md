# Proximity Voice Bridge — Tuto complet (test à 2 joueurs)

Système de voix de proximité : le volume entre toi et ton pote dépend de votre
distance réelle en jeu sur ton serveur Bedrock. 100% gratuit (aucune carte
bancaire requise, juste un compte Discord + Node.js).

🗂️ **Regarde `GUIDE_COMPLET.md`** — c'est LE fichier à suivre, toutes les
étapes dans l'ordre en une seule checklist, du tout début jusqu'au bot qui
tourne. Les fichiers ci-dessous sont les détails/alternatives si besoin.

☁️ **Serveur sur Aternos + iPhone uniquement ?** Regarde `RENDER_DEPLOY.md`
— c'est le chemin le plus simple maintenant : GitHub + Render, sans
Tailscale ni Docker, tout depuis Safari.

📱 **Pas de PC, monde encore en LAN ?** Regarde `TERMUX.md` — tuto pour
faire tourner ça depuis un téléphone/tablette Android via Termux.

☁️ **iPhone uniquement, monde encore en LAN ?** Regarde
`CLOUD_TAILSCALE.md` — solution plus complexe (Tailscale + Docker), à
utiliser seulement si tu n'es pas passé sur Aternos.

---

## Ce qu'il te faut avant de commencer

- Un serveur Discord où tu es admin (ou owner)
- [Node.js](https://nodejs.org/) version 18 ou plus, installé sur le PC qui fera tourner le script (le tien ou celui d'un pote, pas besoin d'un serveur payant pour tester)
- L'accès à ton serveur Bedrock (IP + port)

---

## Étape 0 — Spécifique aux mondes LAN local

Ton serveur est un monde ouvert en LAN, pas un serveur dédié. Le script
**détecte automatiquement le monde sur le réseau local** (comme le fait
l'onglet "Amis" du jeu) — tu n'as normalement rien à configurer côté IP.

Seule vraie contrainte : **le script doit tourner sur un ordinateur connecté
au même réseau Wi-Fi** que l'appareil qui héberge le monde. Impossible de le
faire tourner depuis internet ou un réseau différent.

Si la détection auto ne trouve rien (pare-feu strict, réseau bizarre...), tu
peux toujours forcer l'IP manuellement dans `.env` :
- **iOS** : Réglages → Wi-Fi → tape le ⓘ à côté du réseau connecté → note
  l'"Adresse IPv4"
- Remplace alors `MC_HOST=auto` par cette IP dans le `.env`

---

## Étape 1 — Créer les 2 bots Discord (gratuit)

Tu dois créer **2 applications Discord distinctes** (donc 2 bots).

1. Va sur https://discord.com/developers/applications
2. Clique **"New Application"**, donne-lui un nom (ex : `ProxyBot1`), accepte les conditions, clique **Create**
3. Dans le menu de gauche, clique sur **"Bot"**
4. Clique **"Reset Token"** (ou "Add Bot" si demandé), puis **copie le token** qui s'affiche
   ⚠️ Ce token est un mot de passe, ne le partage jamais publiquement (pas de screenshot, pas de Github public)
5. Toujours dans l'onglet Bot, désactive **"Public Bot"** (comme ça personne d'autre ne peut l'inviter)
6. **Refais exactement les mêmes étapes** pour créer un 2ème bot (ex : `ProxyBot2`)

Tu as maintenant 2 tokens. Garde-les de côté.

---

## Étape 2 — Inviter les 2 bots sur ton serveur

Pour chaque bot, dans son application :

1. Menu de gauche → **OAuth2** → **URL Generator**
2. Dans **Scopes**, coche : `bot` **et** `applications.commands` (ce
   deuxième scope est nécessaire pour que la commande `/connect` apparaisse)
3. Dans **Bot Permissions**, coche :
   - View Channels
   - Connect
   - Speak
   - Use Voice Activity
   - **Manage Channels** (pour créer les salons persos automatiquement)
   - **Move Members** (pour déplacer les joueurs dans leur salon perso)
4. Copie l'URL générée en bas de page, colle-la dans ton navigateur
5. Choisis ton serveur, clique **Autoriser**

Répète pour le 2ème bot.

⚠️ **Étape importante** : pour chacun des 2 bots, retourne dans son application →
onglet **"Bot"** → active le toggle **"Server Members Intent"** (c'est gratuit,
juste un interrupteur à activer). Sans ça, le bot plantera au démarrage avec
une erreur "disallowed intents".

---

## Étape 3 — Créer le salon "lobby"

Contrairement à la V1, tu n'as **plus besoin de créer les 2 salons vocaux à la
main**. Il te faut juste **un seul salon vocal** qui sert de "point d'entrée" :
quand un joueur s'y connecte, son salon perso se crée tout seul et il y est
déplacé automatiquement.

Tu m'as donné l'ID de ce salon (`1521577054036951150`), déjà pré-rempli dans
le `.env.example`. Si tu veux en utiliser un autre, remplace juste
`LOBBY_CHANNEL_ID` dans le `.env`.

Assure-toi juste que les 2 joueurs (et les 2 bots) peuvent voir/rejoindre ce
salon lobby.

---

## Étape 4 — Récupérer les IDs Discord

Active d'abord le **mode développeur** : Discord → Paramètres → Avancés → active "Mode développeur".

Ensuite récupère (clic droit → "Copier l'ID") :
- L'ID de ton **serveur** (clic droit sur le nom du serveur)
- L'ID **Discord des 2 joueurs humains** (clic droit sur leur pseudo)

---

## Étape 5 — Installer le projet

1. Décompresse le dossier `proximity-voice` reçu
2. Ouvre un terminal dedans (clic droit → "Ouvrir un terminal ici" sur Windows, ou `cd` sur le dossier)
3. Installe les dépendances :

```bash
npm install
```

Ça télécharge tout automatiquement (discord.js, la lib audio, etc.), aucune
inscription payante nécessaire, et **aucun compilateur C++/cmake requis** —
le projet force volontairement une version 100% JavaScript de la partie
réseau Minecraft (détails dans `src/bedrockClientJs.js` si ça t'intéresse).

---

## Nouveauté — Commande `/connect`

Plutôt que de renseigner `MC_HOST`/`MC_PORT` en dur dans le `.env`, tu peux
maintenant donner l'adresse du serveur Minecraft **directement depuis
Discord**, pratique si ton hébergeur change de port de temps en temps (par
exemple sur certains hébergeurs gratuits) :

```
/connect ip:monserveur.aternos.me port:19132
```

Le script se reconnecte immédiatement à cette adresse, et **s'en souvient**
même après un redémarrage (le fichier `.last-connection.json`, généré
automatiquement, garde la dernière adresse utilisée).

⚠️ Pour que la commande apparaisse dans Discord, il faut ajouter le scope
**`applications.commands`** en plus de `bot` lors de la génération du lien
d'invitation (Étape 2, OAuth2 → URL Generator → coche aussi
`applications.commands`). Par défaut, seuls les membres avec la permission
"Gérer le serveur" peuvent utiliser `/connect`.

---

## Étape 6 — Configurer le `.env`

1. Duplique le fichier `.env.example` et renomme la copie en `.env`
2. Ouvre `.env` avec un éditeur de texte (Bloc-notes, VSCode...) et remplis chaque ligne avec :
   - Les 2 tokens de bots (étape 1)
   - Les 2 ID de salons vocaux (étape 3-4)
   - L'ID du serveur (étape 4)
   - Les 2 ID Discord des joueurs (étape 4)
   - L'IP/port de ton serveur Bedrock
   - Les **pseudos Minecraft exacts** des 2 joueurs (sensible à la casse)
   - Les portées `MIN_RANGE` / `MAX_RANGE` en blocs (par défaut : volume plein en dessous de 5 blocs, silence total au-delà de 40)

---

## Étape 7 — Lancer

```bash
npm start
```

Si tout va bien, tu verras dans le terminal :
```
[discord] ProxyBot1#xxxx connecté.
[discord] ProxyBot2#xxxx connecté.
[channelManager] En écoute sur le salon lobby 1521577054036951150
[position] Connecté au serveur, suivi des positions en cours...
```

Puis, quand un joueur rejoint le salon lobby :
```
[channelManager] Salon créé : 🎙️ Voix - PseudoJoueur1 (...)
[main] player1 -> salon ..., connexion du bot...
[status] distance=12.3m  volume=68%
```

**Le fonctionnement concret :**
1. Joueur1 rejoint le salon lobby → un salon `🎙️ Voix - PseudoJoueur1` est créé
   automatiquement, visible seulement par lui + son bot, et il y est déplacé
2. Même chose pour Joueur2
3. Une fois les 2 dans leur salon perso, le pont audio s'active automatiquement
4. Vous parlez normalement, le volume change selon votre distance en jeu
5. Quand un joueur quitte son salon (déco ou changement), le salon perso est
   supprimé automatiquement après 10 secondes s'il reste vide

---

## Problèmes fréquents

**Erreur "Used disallowed intents" au démarrage**
→ Tu as oublié d'activer le toggle **"Server Members Intent"** dans l'onglet
Bot de chacune des 2 applications Discord (étape 2). Sans ça les bots
refusent de se connecter.

**Un bot ne rejoint pas le salon vocal / ne peut pas créer de salon**
→ Vérifie que les 2 bots ont bien les permissions **Manage Channels** et
**Move Members** (étape 2), et qu'ils voient bien le salon lobby.

**Le suivi de position ne marche jamais malgré des IDs/pseudos corrects (monde LAN)**
→ Regarde les logs au démarrage : tu dois voir `[lanDiscovery] Monde trouvé...`.
Si tu vois plutôt `Aucun monde trouvé`, vérifie que :
- le script tourne sur le même réseau Wi-Fi que l'appareil qui héberge le monde
- le monde est bien ouvert au LAN au moment du lancement du script
- ton pare-feu/antivirus n'bloque pas le trafic UDP broadcast (rare mais possible)
Si ça persiste, force l'IP manuellement avec `MC_HOST=192.168.x.x` dans `.env`
(voir Étape 0 pour savoir où la trouver sur iOS).

**`[position]` n'affiche jamais de distance / reste sur `??`**
→ Le nom des pseudos dans `.env` doit être EXACTEMENT celui en jeu.
→ Selon la version de ton serveur Bedrock, certains noms de paquets réseau
peuvent légèrement différer. Ouvre `src/positionTracker.js`, décommente la
ligne `// client.on('packet', ...)`, relance, et regarde dans le terminal
quels paquets remontent pour repérer le bon nom si besoin. Dis-le-moi si tu
bloques là-dessus, je peux ajuster.

**Erreur de connexion au serveur Bedrock**
→ Vérifie l'IP/port, et que ton serveur autorise les connexions "offline"
(si tu as l'authentification Xbox obligatoire, il faudra changer `offline: true`
en `false` dans `positionTracker.js`, ce qui demande une étape de login
supplémentaire — dis-moi si c'est ton cas).

**Erreur `npm install` qui tente de compiler quelque chose**
→ Ne devrait plus arriver : le fichier `.npmrc` du projet désactive les
scripts de build automatiquement. Si ça arrive quand même (par ex. si tu as
supprimé `.npmrc` par erreur), relance avec `npm install --ignore-scripts`.

---

## Limites de cette V1 (normal pour un test)

- Marche seulement à 2 joueurs fixes (configurés en dur dans `.env`)
- Salons persos créés automatiquement, mais pas encore de vraie liaison
  Discord ↔ Minecraft par commande (`/link`) — les pseudos sont en dur
- Le fondu de volume est linéaire simple (pas de son directionnel/3D)

Une fois que le test marche bien à 2, on pourra parler de comment monter en
charge (plus de joueurs, salons créés automatiquement, etc).
