# Guide complet — Du zéro à un bot fonctionnel (iPhone uniquement)

Tout dans l'ordre, une seule suite d'étapes. Coche-les au fur et à mesure.

---

## PARTIE A — Les 2 bots Discord

### A1. Créer les 2 applications Discord
- [ ] Safari → **discord.com/developers/applications**
- [ ] **New Application** → nomme-le (ex: `ProxyBot1`) → **Create**
- [ ] Onglet **Bot** → **Reset Token** → copie le token → colle-le
      quelque part temporairement (Notes, par ex.) en attendant de
      l'utiliser à l'étape D4
- [ ] Désactive **Public Bot**
- [ ] Toujours dans l'onglet Bot → active **Server Members Intent**
      **et** **Message Content Intent** (ce 2ème est nécessaire pour lire
      la réponse de ton bot Galaxium Bot à `!joueurs`)
- [ ] **Répète tout ça pour un 2ème bot** (`ProxyBot2`)

### A2. Inviter les 2 bots sur ton serveur
Pour chacun des 2 bots :
- [ ] Onglet **OAuth2** → **URL Generator**
- [ ] Scopes : coche `bot` **et** `applications.commands`
- [ ] Bot Permissions : coche `View Channels`, `Connect`, `Speak`,
      `Use Voice Activity`, `Manage Channels`, `Move Members`,
      `Send Messages`, `Read Message History`
- [ ] Copie l'URL générée en bas → ouvre-la → choisis ton serveur → Autoriser

### A3. Récupérer les IDs Discord
- [ ] Discord → Réglages → Avancés → active **Mode développeur**
- [ ] Clic droit sur ton serveur → **Copier l'ID** (= `GUILD_ID`)
- [ ] Vérifie que le salon lobby (`1521577054036951150`) et le salon `!joueurs`
      (`1521492585393160222`) sont visibles par vous deux + les 2 bots
- [ ] ⚡ Plus besoin de récupérer vos IDs Discord à l'avance — le 1er qui
      rejoint le salon lobby devient automatiquement "joueur 1", le 2ème
      "joueur 2"

---

## PARTIE B — Le monde Minecraft sur Aternos

### B1. Exporter ton monde
- [ ] Minecraft → modifier ton monde → **Exporter** (crée un `.mcworld`)
- [ ] Dans l'app **Fichiers**, renomme l'extension `.mcworld` en `.zip`

### B2. Créer le serveur Aternos
- [ ] Safari → **aternos.org** → crée un compte (gratuit)
- [ ] **Créer un serveur** → **Bedrock Edition**
- [ ] Onglet **Worlds** → **Upload** → sélectionne ton `.zip` → une fois
      importé, sélectionne-le comme monde actif dans les Options

---

## PARTIE C — Le code sur GitHub

- [ ] Safari → **github.com** → crée un compte (gratuit, pas de CB)
- [ ] **+** → **New repository** → nom `proximity-voice` → coche
      **Private** → **Create repository**
- [ ] Sur le dépôt vide → **uploading an existing file**
- [ ] Dézippe `proximity-voice.zip` (le mien) dans l'app Fichiers si pas
      déjà fait, puis glisse/sélectionne **tous les fichiers et dossiers**
      du projet dans la zone d'upload GitHub (surtout le dossier `src/`)
- [ ] **Commit changes**

---

## PARTIE D — Le déploiement sur Render

### D1. Créer le compte
- [ ] Safari → **render.com** → inscription (gratuit, pas de CB)

### D2. Créer le service
- [ ] Dashboard → **New** → **Web Service**
- [ ] Connecte le dépôt `proximity-voice`

### D3. Configurer
- [ ] **Build Command** : `npm install`
- [ ] **Start Command** : `node src/index.js`
- [ ] **Instance Type** : **Free**

### D4. Ajouter les variables d'environnement
Bouton **Advanced** → **Add Environment Variable**, une par une :

| Clé | Valeur |
|---|---|
| `BOT1_TOKEN` | le token du bot 1 (étape A1) |
| `BOT2_TOKEN` | le token du bot 2 (étape A1) |
| `GUILD_ID` | l'ID de ton serveur (étape A3) |
| `LOBBY_CHANNEL_ID` | `1521577054036951150` |
| `PLAYERS_CHANNEL_ID` | `1521492585393160222` (le salon où vous tapez `!joueurs`) |
| `MC_HOST` | `auto` |
| `MIN_RANGE` | `5` |
| `MAX_RANGE` | `40` |

- [ ] **Create Web Service** → attends que le statut passe à "Live"
- [ ] Vérifie l'onglet **Logs** : tu dois voir les 2 bots se connecter

### D5. Empêcher la mise en veille
- [ ] Copie l'URL publique du service Render (en haut du dashboard)
- [ ] Safari → **uptimerobot.com** → crée un compte (gratuit)
- [ ] **Add New Monitor** → type HTTP(s) → colle l'URL → intervalle 5 min → sauvegarde

---

## PARTIE E — Connecter le tout

- [ ] Démarre ton serveur sur Aternos (bouton Start, patience le temps de
      la file d'attente)
- [ ] Note l'adresse (`xxx.aternos.me`) et le port affichés
- [ ] Dans un salon Discord où les bots sont présents, tape :
      ```
      /connect ip:xxx.aternos.me port:19132
      ```
- [ ] Vérifie dans les **Logs Render** que tu vois `[position] Connecté à ...`
- [ ] Toi et ton pote rejoignez le salon lobby Discord → vos salons persos
      se créent automatiquement → parlez et bougez en jeu pour tester

---

**Si un point coince**, dis-moi précisément à quelle case tu es bloqué
(ex: "D4, le service reste sur Deploying") plutôt que "ça marche pas" —
ça m'aide à cibler direct le bon réglage.
