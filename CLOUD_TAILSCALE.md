# Héberger le bot dans le cloud + Tailscale (depuis iPhone uniquement)

Ce tuto ne demande NI PC NI Android. Tout se pilote depuis ton iPhone via une
appli SSH. Mais c'est plus long que les autres méthodes — compte 30-45 min la
première fois.

⚠️ **Deux trucs à savoir avant de te lancer :**
1. La création du compte cloud (étape 2) demande une **carte bancaire pour
   vérification d'identité** — c'est standard chez tous les hébergeurs
   sérieux, même les offres "gratuites à vie". **Tu ne seras pas prélevé**
   si tu restes sur l'offre gratuite (choisis bien les instances marquées
   "Always Free"), mais je préfère te prévenir avant que tu commences.
2. Je n'ai pas pu tester en conditions réelles que Minecraft Bedrock accepte
   une connexion venant de l'interface réseau Tailscale plutôt que du Wi-Fi
   classique. C'est une technique très utilisée pour ce genre de bidouille
   gaming cross-réseau, donc ça a de bonnes chances de marcher, mais si ça
   coince à cette étape précise, dis-le-moi et on creusera ensemble.

---

## Vue d'ensemble

```
[Ton iPhone, héberge le monde]  <--- Tailscale (VPN) --->  [Serveur cloud gratuit, fait tourner le script]
```

Tailscale connecte virtuellement ton iPhone et le serveur cloud comme s'ils
étaient sur le même Wi-Fi, sans toucher à ta box. Le serveur cloud tourne
24/7, le script Discord + suivi de position vivent là-bas en permanence.

---

## Étape 1 — Installer Tailscale sur ton iPhone

1. App Store → cherche **"Tailscale"** → installe (gratuit)
2. Ouvre l'app, connecte-toi (bouton "Sign in" — tu peux utiliser Google,
   GitHub, Microsoft ou Apple, pas besoin de créer un mot de passe séparé)
3. Autorise la config VPN quand iOS le demande (c'est normal, Tailscale
   fonctionne techniquement comme un VPN)
4. Une fois connecté, ton iPhone apparaît dans "Ton réseau" avec un nom et
   une IP qui commence par `100.` — **note cette IP**, tu en auras besoin
   plus tard (visible aussi sur https://login.tailscale.com/admin/machines
   depuis Safari)

---

## Étape 2 — Créer un compte cloud gratuit (Oracle Cloud)

Oracle Cloud propose des machines **gratuites à vie** (pas juste un essai
limité), suffisant pour ce projet.

1. Va sur https://www.oracle.com/cloud/free/ depuis Safari
2. Clique "Start for free", crée un compte (email + carte bancaire pour
   vérification, voir avertissement plus haut)
3. Une fois le compte créé et vérifié, va dans le menu (☰) → **Compute** →
   **Instances** → **Create Instance**
4. Configure :
   - **Name** : `proximity-voice` (ou ce que tu veux)
   - **Image** : Ubuntu (la version la plus récente proposée)
   - **Shape** : choisis une forme marquée **"Always Free"** (important,
     sinon tu risques d'être facturé) — la config ARM Ampere gratuite est
     largement suffisante
   - **Add SSH keys** : choisis "Generate a key pair for me", puis
     **télécharge la clé privée** (fichier `.key` ou `.pem`) — tu vas la
     transférer sur ton iPhone (AirDrop depuis un ordi si t'en croises un
     une fois, ou envoie-toi le fichier par mail/Fichiers iCloud/AirDrop
     depuis Safari directement si tu télécharges sur l'iPhone)
5. Clique **Create**, attends 1-2 min que l'instance soit "Running"
6. Note l'**adresse IP publique** affichée sur la page de l'instance

---

## Étape 3 — Installer une appli SSH sur ton iPhone

1. App Store → cherche **"Termius"** → installe (gratuit, l'usage de base suffit)
2. Ouvre Termius → ajoute un nouvel hôte (bouton "+") :
   - **Address** : l'IP publique de ton instance Oracle (étape 2.6)
   - **Username** : `ubuntu` (utilisateur par défaut sur les images Oracle Ubuntu)
   - **Key** : importe la clé privée téléchargée à l'étape 2.4 (Termius a un
     bouton pour importer une clé depuis l'app Fichiers)
3. Connecte-toi — tu dois arriver sur un terminal Linux, hébergé dans le cloud,
   piloté depuis ton iPhone

À partir d'ici, toutes les commandes suivantes se tapent dans ce terminal Termius.

---

## Étape 4 — Installer Node.js et Tailscale sur le serveur cloud

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm unzip tmux

# Installer Tailscale sur le serveur
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

La dernière commande affiche un lien `https://login.tailscale.com/...` →
ouvre-le dans Safari sur ton iPhone, connecte-toi avec le **même compte
Tailscale** qu'à l'étape 1. Le serveur rejoint alors ton réseau Tailscale et
peut voir ton iPhone.

Vérifie la connexion :
```bash
tailscale status
```
Tu dois voir ton iPhone listé avec son IP `100.x.x.x`.

---

## Étape 5 — Envoyer le projet sur le serveur

Dans Termius, ouvre le **gestionnaire de fichiers SFTP** (icône dédiée, en
général une icône de dossier à côté du terminal) :
1. Sur ton iPhone, télécharge `proximity-voice.zip` (depuis Claude) dans
   l'app Fichiers si ce n'est pas déjà fait
2. Dans Termius SFTP, navigue jusqu'au dossier home du serveur (`/home/ubuntu`)
3. Transfère `proximity-voice.zip` depuis l'app Fichiers de ton iPhone vers
   ce dossier (glisser-déposer ou bouton d'upload selon la version de Termius)

Retourne dans le terminal Termius :
```bash
cd ~
unzip proximity-voice.zip
cd proximity-voice
npm install
```

---

## Étape 6 — Configurer le `.env`

```bash
cp .env.example .env
nano .env
```

Remplis toutes les variables comme d'habitude (voir le tableau donné plus
tôt), **sauf** la partie Minecraft :

```
MC_HOST=100.x.x.x   <-- l'IP Tailscale de ton iPhone (étape 1.4), PAS "auto"
MC_PORT=19132
```

Comme le broadcast LAN ne traverse pas un VPN, la détection automatique ne
fonctionnera pas ici — on connecte directement à l'IP Tailscale de ton
iPhone, ce qui contourne complètement le besoin de découverte.

Sauvegarde avec `Ctrl+O`, `Entrée`, quitte avec `Ctrl+X`.

---

## Étape 7 — Lancer le script en continu

On utilise `tmux` pour que le script continue de tourner même quand tu
fermes Termius ou éteins ton iPhone :

```bash
tmux new -s proximity
npm start
```

Regarde les logs quelques secondes pour vérifier que tout se connecte bien.
Ensuite, **détache la session** (le script continue de tourner en arrière-plan)
en appuyant sur `Ctrl+B` puis `D`.

Tu peux fermer Termius, éteindre ton iPhone : le serveur cloud continue de
tourner 24/7.

Pour revoir les logs plus tard, reconnecte-toi en SSH et tape :
```bash
tmux attach -t proximity
```

---

## Vérifier que Minecraft accepte bien la connexion Tailscale

C'est le point le plus incertain du tuto (voir l'avertissement en haut).
Dans les logs `npm start`, si tu vois :
```
[position] Connecté au serveur, suivi des positions en cours...
```
→ Bonne nouvelle, ça marche.

Si ça reste bloqué ou affiche une erreur de connexion après plusieurs
tentatives → il est possible que le monde LAN Bedrock n'accepte pas les
connexions venant d'une interface réseau "étrangère" (Tailscale) même si
elle semble locale. Dis-le-moi avec le message d'erreur exact, on regardera
ensemble une alternative (par exemple, exposer un vrai petit serveur Bedrock
dédié plutôt qu'un monde LAN, qui serait plus fiable dans ce genre de setup).
