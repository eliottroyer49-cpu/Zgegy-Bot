# Déployer le bot (Render + GitHub, depuis iPhone uniquement)

Comme ton monde est maintenant sur **Aternos** (IP + port publics), on n'a
plus besoin de Tailscale ni de Docker — juste GitHub (pour héberger le code)
et Render (pour le faire tourner), tous deux gratuits et sans carte bancaire.
Tout se pilote depuis Safari.

---

## Étape 1 — Créer un compte GitHub

1. Safari → **github.com** → **Sign up**
2. Email + mot de passe, pas de CB demandée
3. Confirme ton email

## Étape 2 — Créer un dépôt et y mettre le projet

1. En haut à droite → **+** → **New repository**
2. Nom : `proximity-voice` (ou ce que tu veux) → coche **Private** (pour ne
   pas exposer tes tokens par erreur) → **Create repository**
3. Sur la page du dépôt vide, clique **uploading an existing file**
4. Dans l'app **Fichiers** de ton iPhone, dézippe `proximity-voice.zip` si
   ce n'est pas déjà fait
5. Depuis la page GitHub, sélectionne/glisse **tous les fichiers et dossiers**
   du projet dézippé (y compris le dossier `src/`) dans la zone d'upload
   - ⚠️ N'upload PAS le fichier `.env` (tu n'en as normalement pas encore
     créé un ici, c'est bien) — les vraies valeurs seront saisies plus tard
     directement dans Render, jamais dans le code
6. En bas, clique **Commit changes**

## Étape 3 — Créer un compte Render

1. Safari → **render.com** → **Get Started** → inscris-toi (email, GitHub,
   ou Google — pas de CB demandée pour l'offre gratuite)
2. Si tu t'inscris avec GitHub, autorise l'accès à ton dépôt `proximity-voice`

## Étape 4 — Créer le service

1. Dashboard Render → **New** → **Web Service**
2. Connecte ton dépôt `proximity-voice`
3. Configure :
   - **Name** : ce que tu veux
   - **Region** : la plus proche de toi (Europe si tu es en France)
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `node src/index.js`
   - **Instance Type** : **Free**
4. Clique **Advanced** → **Add Environment Variable**, et rentre **toutes**
   les variables une par une (les mêmes que le tableau donné plus tôt dans
   la conversation) :

| Clé | Valeur |
|---|---|
| `BOT1_TOKEN` | ton token du bot 1 |
| `BOT2_TOKEN` | ton token du bot 2 |
| `GUILD_ID` | ID de ton serveur Discord |
| `LOBBY_CHANNEL_ID` | `1521577054036951150` (ou le tien) |
| `PLAYER1_DISCORD_ID` | ton ID Discord |
| `PLAYER2_DISCORD_ID` | l'ID Discord de ton pote |
| `PLAYER1_MC_NAME` | ton pseudo Minecraft exact |
| `PLAYER2_MC_NAME` | le pseudo Minecraft exact de ton pote |
| `MC_HOST` | `auto` (tu utiliseras `/connect` une fois déployé, pas besoin de renseigner l'adresse Aternos ici) |
| `MIN_RANGE` | `5` |
| `MAX_RANGE` | `40` |

5. Clique **Create Web Service** en bas

Render va installer les dépendances et démarrer le script — regarde les
**Logs** (onglet dans le dashboard) pour vérifier que les 2 bots se
connectent bien.

## Étape 5 — Empêcher la mise en veille (UptimeRobot)

Render gratuit met le service en veille après 15 min sans requête HTTP.

1. Une fois le service "Live" sur Render, copie son URL publique (visible
   en haut du dashboard, du style `https://tonservice.onrender.com`)
2. Safari → **uptimerobot.com** → crée un compte gratuit (pas de CB)
3. **Add New Monitor** :
   - **Monitor Type** : HTTP(s)
   - **URL** : colle l'URL de ton service Render
   - **Monitoring Interval** : 5 minutes
4. Sauvegarde

À partir de là, UptimeRobot ping ton service toutes les 5 min, ce qui
l'empêche de s'endormir.

## Étape 6 — Inviter les bots et lier le tout

1. Suis les étapes 1-2 du `README.md` (créer les 2 bots Discord, les
   inviter avec les bonnes permissions, activer Server Members Intent,
   ne pas oublier le scope `applications.commands` pour `/connect`)
2. Une fois les bots dans ton serveur Discord et le salon lobby prêt,
   démarre ton serveur Aternos et note son adresse + port
3. Dans un salon Discord où le bot est présent, tape :
   ```
   /connect ip:tonserveur.aternos.me port:19132
   ```
4. Regarde les Logs Render : tu dois voir `[position] Connecté à ...`

C'est tout — le script tourne en continu sur Render, se reconnecte tout
seul si Discord ou Minecraft coupent, et retient la dernière adresse même
après un redéploiement.

---

## Rappel important

Aternos éteint ton serveur Minecraft quand personne n'est connecté (c'est
normal, voir plus haut dans la conversation). Le bot Discord (sur Render)
peut rester allumé en permanence sans souci — c'est une autre plateforme,
sans les mêmes restrictions. Mais le suivi de position ne fonctionnera que
pendant que le serveur Aternos est **démarré et que vous jouez**. Pense à
relancer `/connect` avec la nouvelle adresse si jamais le port change après
un redémarrage du serveur Aternos.
