# Installer et lancer le projet sur Android (sans PC), via Termux

Termux est une appli qui donne un vrai terminal Linux sur Android — on peut y
faire tourner Node.js normalement. Le projet est déjà 100% JavaScript (aucune
compilation native), donc ça passe sans souci.

---

## Étape 1 — Installer Termux (PAS depuis le Play Store)

⚠️ Important : la version Termux du Play Store est abandonnée et cassée
depuis des années. Il faut l'installer depuis **F-Droid** :

1. Va sur https://f-droid.org depuis ton navigateur Android, installe F-Droid
   (ça va te demander d'autoriser l'installation d'apps hors Play Store —
   normal, accepte)
2. Ouvre F-Droid, cherche **"Termux"**, installe-le
3. Ouvre Termux

---

## Étape 2 — Installer Node.js et les outils dans Termux

Dans le terminal Termux, tape (Entrée après chaque ligne) :

```bash
pkg update && pkg upgrade -y
pkg install nodejs git unzip nano -y
```

Ça télécharge tout automatiquement, gratuit, pas de compte à créer.

Vérifie que Node est bien installé :
```bash
node -v
```
(tu dois voir un numéro de version genre `v20.x.x`)

---

## Étape 3 — Donner à Termux l'accès au stockage du téléphone

```bash
termux-setup-storage
```
Un popup Android va demander une autorisation → accepte.

---

## Étape 4 — Récupérer le projet sur ton téléphone

1. Télécharge le fichier `proximity-voice.zip` que je t'ai donné (depuis
   l'appli Claude, sur ton téléphone) → il atterrit normalement dans le
   dossier "Téléchargements" du téléphone
2. Dans Termux :

```bash
cd storage/downloads
unzip proximity-voice.zip
cd proximity-voice
```

---

## Étape 5 — Installer les dépendances

```bash
npm install
```

Ça prend une ou deux minutes sur téléphone, patience.

---

## Étape 6 — Configurer le `.env`

```bash
cp .env.example .env
nano .env
```

Remplis chaque valeur (voir le tableau des variables qu'on a fait plus tôt
dans la conversation). Dans `nano` :
- Tu déplaces le curseur avec les flèches, tu tapes normalement
- Pour sauvegarder : `Ctrl+O` puis `Entrée`
- Pour quitter : `Ctrl+X`

---

## Étape 7 — Empêcher Android de tuer le script en arrière-plan

Android adore fermer les apps en arrière-plan pour économiser la batterie —
il faut lui dire explicitement de laisser Termux tranquille pendant le test :

1. Installe aussi l'appli **Termux:API** depuis F-Droid (comme à l'étape 1)
2. Dans Termux :
```bash
pkg install termux-api -y
termux-wake-lock
```
3. Dans les réglages Android → Batterie → cherche Termux → mets
   "Pas d'optimisation batterie" / "Sans restriction" pour cette appli
   (le nom exact du menu change selon la marque du téléphone)

---

## Étape 8 — Lancer

```bash
npm start
```

Laisse le téléphone branché sur secteur et l'écran peut être éteint tant que
`termux-wake-lock` est actif — le script continue de tourner.

Pour arrêter : `Ctrl+C` dans Termux.

---

## Notes spécifiques Termux

- Si tu fermes complètement l'appli Termux (pas juste minimisée), le script
  s'arrête. Garde-la en arrière-plan, ne la "swipe" pas pour la fermer.
- Si `npm install` semble planté ou très lent, relance-le simplement
  (`npm install` à nouveau) — ça reprend où c'était resté.
- `nano` pas pratique ? Tu peux aussi éditer le `.env` avec une appli de
  fichiers/éditeur de texte Android classique, tant qu'elle a accès au
  dossier `Téléchargements/proximity-voice/`.
