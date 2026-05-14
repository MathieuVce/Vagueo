# Vaguéo — Guide de déploiement

## Prérequis
- Node.js 20+
- Compte Firebase (gratuit — plan Spark suffit sauf pour les notifications push en arrière-plan)
- Compte Vercel (gratuit)

---

## 1. Firebase — Création du projet

1. Va sur [console.firebase.google.com](https://console.firebase.google.com)
2. **Créer un projet** → nom : `vagueo` (ou ce que tu veux)
3. Désactiver Google Analytics (optionnel)

### Firestore
- **Build → Firestore Database → Create database**
- Mode : **Production** (on ajoutera les règles ci-dessous)
- Région : `europe-west1` (ou la plus proche)

### Authentication
- **Build → Authentication → Get started**
- Activer **Anonymous** (sign-in providers)
- Activer **Google** (sign-in providers) → mettre ton email de support → Save

### Règles Firestore
Dans **Firestore → Rules**, coller le contenu du fichier [`firestore.rules`](./firestore.rules) du repo.

Les règles de production couvrent : lecture publique des stands, écriture réservée au vendeur propriétaire, incrémentation du compteur autorisée aux clients anonymes, lecture de l'historique réservée aux comptes Google.

---

## 2. Configuration locale

```bash
cp .env.example .env
```

Remplis `.env` avec tes valeurs Firebase (Project Settings → General → Your apps → Web app) :

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=vagueo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vagueo
VITE_FIREBASE_STORAGE_BUCKET=vagueo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_ADMIN_EMAIL=ton_email@gmail.com   # restreint l'accès /admin à cet email
```

---

## 3. Lancer en développement

```bash
npm install
npm run dev
# → http://localhost:3000       (écran client)
# → http://localhost:3000/vendor (dashboard vendeur)
```

---

## 4. Déploiement Vercel

### Via GitHub (recommandé)
1. Push ce repo sur GitHub
2. Va sur [vercel.com/new](https://vercel.com/new) → importer le repo
3. **Framework Preset** : Vite (détecté automatiquement)
4. **Environment Variables** : ajoute toutes les variables `VITE_*` depuis ton `.env`
5. Cliquer **Deploy** → URL publique en 2 minutes

### Via CLI
```bash
npm i -g vercel
vercel --prod
```

---

## 5. Notifications push en arrière-plan (optionnel — Blaze requis)

> Sans cette étape, les notifications fonctionnent **quand l'onglet est ouvert**.  
> Pour notifier un client qui a verrouillé son téléphone, il faut Firebase Cloud Functions.

### Activer le plan Blaze
Firebase Console → Upgrade → Blaze (pay-as-you-go). Pour ce volume, le coût est **~0 €/mois**.

### Déployer la Cloud Function

```bash
npm install -g firebase-tools
firebase login
firebase init functions   # sélectionner le projet existant, JavaScript, ESLint non
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Activer FCM + VAPID
1. Firebase Console → **Project Settings → Cloud Messaging**
2. Générer une paire de clés VAPID → copier la **clé publique**
3. Ajouter dans `.env` : `VITE_FIREBASE_VAPID_KEY=BPxxxx...`

---

## 6. URLs de l'application

| URL | Usage |
|-----|-------|
| `https://ton-app.vercel.app/` | QR code du stand → écran client |
| `https://ton-app.vercel.app/vendor` | Dashboard vendeur (sur le smartphone du vendeur) |
| `https://ton-app.vercel.app/admin` | Dashboard admin — restreint à `VITE_ADMIN_EMAIL` |

Le QR code sur l'affiche doit pointer vers **`/`** (l'URL publique Vercel).

---

## 7. Structure Firestore créée automatiquement

```
stands/
  churros_01/
    current_wave: 0
    secure_color: "#39FF14"
    is_paused: false

queue/
  {firebase-auth-uid}/
    uid: "..."
    wave_assigned: 3
    status: "waiting" | "claimed" | "done"
    has_confirmed_presence: false
    timestamp: Timestamp
    claimed_at: Timestamp   ← ajouté quand le client tape "JE SUIS DEVANT"
```

Les documents sont créés automatiquement au premier accès — aucune initialisation manuelle nécessaire.
