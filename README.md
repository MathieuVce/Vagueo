# Vaguéo

**File d'attente mobile pour stands et événements.** Les clients scannent un QR code, suivent leur tour en temps réel et reçoivent une notification quand c'est leur moment — sans compte, sans app à installer.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232A)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&labelColor=1a1a2e)
![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?logo=firebase&logoColor=black&labelColor=FFA000)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)

---

## Fonctionnement

**Côté client** — le visiteur scanne le QR code du stand, rejoint la file sans créer de compte. Il reçoit une notification push quand son tour approche, confirme sa présence d'un tap et montre l'écran coloré anti-fraude au vendeur.

**Côté vendeur** — le gérant ouvre `/vendor?stand=<id>` (via le QR code de gestion) ou `/vendor` sans paramètre pour créer son stand. Connexion Google obligatoire. Les nouveaux stands partent en `pending_approval` jusqu'à validation admin. Un algorithme de vagues avance automatiquement selon le débit réglé. Les absents non répondants sont retirés de la file automatiquement.

**Côté admin** — `/admin` donne accès à un tableau de bord de gestion multi-stands réservé à l'email défini dans `VITE_ADMIN_EMAIL`. Création, édition et suppression de stands, approbation des stands auto-créés par les vendeurs, liaison vendeur, QR codes et statistiques de file en temps réel.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite (PWA) |
| Temps réel | Firebase Firestore (onSnapshot) |
| Auth clients | Firebase Anonymous Auth |
| Auth vendeur | Firebase Google Sign-In |
| Notifications | Web Push API + Service Worker |
| Hosting | Vercel |

## Lancer en local

```bash
git clone https://github.com/MathieuVce/Vagueo.git
cd Vagueo
cp .env.example .env   # remplir avec vos clés Firebase
npm install
npm run dev
```

| URL | Usage |
|---|---|
| `localhost:3000/` | Écran client (QR code) |
| `localhost:3000/vendor` | Dashboard vendeur |
| `localhost:3000/admin` | Dashboard admin (accès restreint) |

Pour la configuration Firebase complète (Firestore, Auth, règles, Vercel, notifications push) → **[SETUP.md](./SETUP.md)**

## Dashboard admin

Accessible sur `/admin` — connexion Google requise. L'accès est restreint à l'email défini dans la variable d'environnement `VITE_ADMIN_EMAIL` (laisser vide pour désactiver la restriction).

### Fonctionnalités

- **Table de stands** — liste tous les stands en temps réel avec statut (ouvert / fermé / en pause), compteurs file et QR code direct
- **StandCard** — aperçu compact : avatar, nom, adresse, badge d'état, raccourcis ouverture/pause
- **StandEditor** (drawer) — édition complète : identité (nom, logo, adresse), liaison du compte vendeur (email Google), débit de service (rythme calme / sprint + tableau de temps par niveau), capacité maximale de file, limite de délais simultanés, état de la file (ouvert/fermé, actif/pause)
- **Création de stand** — formulaire complet avec les mêmes champs, création dans Firestore + génération automatique du QR code
- **Approbation** — les stands auto-créés par les vendeurs (`pending_approval`) apparaissent dans une section dédiée ; un clic les passe en `active`
- **Suppression** — avec confirmation double en ligne
- **Stats live** — la table reflète `onSnapshot` en temps réel

## Tests

**Vitest + React Testing Library** — couverture v8.

```bash
npm test                  # watch mode (tous les fichiers)
npm run coverage          # rapport HTML dans coverage/

npm run test:hooks        # hooks uniquement
npm run test:pages        # pages (unit + flow)
npm run test:screens      # screens
npm run test:ui           # composants UI
npm run test:components   # composants partagés
npm run test:flows        # parcours utilisateurs uniquement
```

### Tests unitaires — 43 fichiers · 319 tests

| Zone | Fichiers couverts | Lignes |
|---|---|---|
| `src/hooks` | useStand (+ cas STAND_ID vide), useVendorAuth, useClientSession, useQueueCounts, useClock, useDevHelpers, usePush | 97 % |
| `src/screens` | ScreenSplash, ScreenAttente, ScreenCheckin, ScreenValidation, ScreenStats, ScreenVendor, ScreenVendorLogin, ScreenVendorSetup, ScreenVendorCreate, ScreenQRCode, ScreenMerci, DevModeChoice | 95 % |
| `src/ui` | Button, Field, Label, Segment, Toggle, Toast, Drawer | 96 % |
| `src/components` | ModalDialog, ModalRating, VgButton, ErrorBoundary, VagueoLogo, WaveBackground, SecureColorBg | 54 %* |
| `src/pages` | AdminApp, VendorApp, ClientApp (+ cas sans `?stand=`) | 88 % |

\* `RippleCanvas` et `WaveBackground` sont des animations canvas non exercées en tests.

**Couverture globale : 85 % instructions · 80 % branches · 88 % lignes**

### Tests de flux — 3 fichiers · 22 parcours

Parcours utilisateurs complets avec hooks mockés et screens réels (sauf exceptions Firebase).

**`ClientApp.flow.test.tsx` — 6 parcours**

| Parcours | Ce qui est vérifié |
|---|---|
| Complet | splash → rejoindre → attente → appelé → service → noter → terminer |
| Délai | checkin timeout → modal orange → clic "Décaler" → modal fermé |
| Abandon | checkin timeout (délai épuisé) → modal orange → quitter la file |
| Fin de service | service timeout → "J'ai fini" → notation 5 étoiles → soumettre |
| File fermée | bouton "Rejoindre" absent sur le splash quand `is_open = false` |
| Pause | overlay "En pause" visible → disparaît après reprise du stand |

**`VendorApp.flow.test.tsx` — 7 parcours** *(screens mockés pour isoler la logique de navigation)*

| Parcours | Ce qui est vérifié |
|---|---|
| Connexion | chargement → login → clic Google → tableau de bord |
| Pause | "Mettre en pause" → `togglePause` appelé → "Reprendre" affiché |
| File | "Fermer la file" → `toggleOpen` appelé → "Ouvrir la file" affiché |
| Paramètres | overlay setup → "Annuler" → retour tableau de bord |
| QR code | overlay QR → bouton × → retour tableau de bord |
| Statistiques | overlay stats → "Fermer" → retour tableau de bord |
| Setup initial | stand sans nom → form auto-ouvert → sauvegarder → tableau de bord |

**`VendorApp.nostand.test.tsx` — 7 cas + 1 flux** *(STAND_ID vide)*

| Cas / Parcours | Ce qui est vérifié |
|---|---|
| Auth en cours | spinner affiché, pas d'écran de création |
| Utilisateur null | écran de login affiché |
| Utilisateur anonyme | écran de login affiché |
| Google connecté | `ScreenVendorCreate` affiché avec l'email |
| Redirection | `window.location.replace('/vendor?stand=<id>')` déclenché |
| Flux complet | chargement → login → connexion → `ScreenVendorCreate` → création → redirection |

---

## Structure Firestore

```
stands/{standId}          ← config du stand (wave, couleur, is_open, vendor_uid…)
stands/{standId}/history  ← statistiques de passage (1 doc par session client)
queue/{uid}               ← position en file (1 doc par client anonyme)
```

## Règles Firestore

Les règles de sécurité sont dans [`firestore.rules`](./firestore.rules). Elles doivent être déployées sur le projet Firebase — sinon les clients reçoivent une erreur 403 au moment de rejoindre la file.

### Déployer via CLI

```bash
# Première connexion (ou reconnexion)
npx firebase-tools login

# Déployer les règles
npx firebase-tools deploy --only firestore:rules --project <project-id>
```

### Déployer via Console Firebase

1. Ouvrir [console.firebase.google.com](https://console.firebase.google.com) → ton projet → Firestore → **Règles**
2. Coller le contenu de `firestore.rules`
3. Cliquer **Publier**

### Ce que font les règles

| Collection | Lecture | Écriture |
|---|---|---|
| `stands` | Tout le monde | Vendeur propriétaire · incrément compteur (clients anonymes) |
| `stands/{id}/history` | Vendeur propriétaire | Tout utilisateur authentifié |
| `queue` | Tout utilisateur authentifié | Chacun son propre document |

## Déploiement

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Importer le repo sur Vercel, ajouter les variables `VITE_FIREBASE_*` depuis `.env`, déployer.
