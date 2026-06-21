# Vaguéo

File d'attente mobile pour stands et événements. Les clients scannent un QR code, suivent leur tour en temps réel et reçoivent une notification quand c'est leur moment, sans compte ni application à installer.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&labelColor=20232A)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&labelColor=1a1a2e)
![Firebase](https://img.shields.io/badge/Firebase-10-FFCA28?logo=firebase&logoColor=black&labelColor=FFA000)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)

## Fonctionnement

Trois rôles, une seule application front (React + Firestore temps réel, sans backend applicatif).

**Client** (anonyme) : scanne le QR du stand et rejoint la file sans compte. Il est prévenu quand sa vague approche, confirme sa présence d'un tap, puis présente l'écran coloré anti-fraude au vendeur.

**Vendeur** (Google) : ouvre `/vendor?stand=<id>` (QR de gestion) ou `/vendor` pour créer un stand. Les nouveaux stands restent en `pending_approval` jusqu'à validation admin. La file avance **par vagues** : les clients arrivés ensemble passent en groupe, à une cadence calée sur le débit de service. Les absents sont retirés automatiquement.

**Admin** (Google) : `/admin` ouvre un tableau de bord multi-stands réservé à l'email `VITE_ADMIN_EMAIL`. Création, édition, suppression et approbation des stands, liaison vendeur, QR codes et statistiques en temps réel.

## Modèle de file par vagues

Pas de numéro individuel : on rejoint une vague et c'est la vague entière qui passe. L'affectation est hybride (fenêtre de temps plafonnée à la taille de vague), l'appel se fait une vague à l'avance, et l'estimation d'attente se met à jour en continu. Le temps de service réel est appris (moyenne mobile bornée) pour affiner la cadence.

## Stack

| Couche        | Technologie                     |
| ------------- | ------------------------------- |
| Frontend      | React 18 + Vite 8 (PWA)         |
| Temps réel    | Firebase Firestore (onSnapshot) |
| Auth client   | Firebase Anonymous Auth         |
| Auth vendeur  | Firebase Google Sign-In         |
| Notifications | Web Push API + Service Worker   |
| Hébergement   | Vercel                          |

## Démarrage local

```bash
git clone https://github.com/MathieuVce/Vagueo.git
cd Vagueo
cp .env.example .env   # renseigner les clés Firebase
npm install
npm run dev
```

| URL                     | Usage                             |
| ----------------------- | --------------------------------- |
| `localhost:3000/`       | Écran client (QR code)            |
| `localhost:3000/vendor` | Tableau de bord vendeur           |
| `localhost:3000/admin`  | Tableau de bord admin (restreint) |

Configuration Firebase complète (Firestore, Auth, règles, Vercel, push) : [SETUP.md](./SETUP.md).

## Qualité et tests

```bash
npm run check        # typecheck + lint + tests (porte de qualité, aussi en pre-push)
npm test             # Vitest en watch
npm run coverage     # rapport de couverture
```

Scripts ciblés : `test:hooks`, `test:pages`, `test:screens`, `test:ui`, `test:components`, `test:flows`, `test:wave` (maths de vague et attente selon affluence). Firestore est mocké en test : on asserte les appels Firestore, pas une vraie base.

## Structure Firestore

```
stands/{standId}          config + état temps réel (current_wave, fill_wave, is_open, vendor_uid…)
stands/{standId}/history  archive des passages (1 doc par session, pour les stats)
queue/{uid}               1 doc par client en file (wave_number = sa vague)
```

## Règles Firestore

Les règles vivent dans [`firestore.rules`](./firestore.rules) et doivent être déployées sur le projet Firebase, sinon les clients reçoivent une erreur 403 en rejoignant la file.

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project <project-id>
```

| Collection            | Lecture                      | Écriture                                             |
| --------------------- | ---------------------------- | ---------------------------------------------------- |
| `stands`              | Tout le monde                | Vendeur propriétaire, compteurs file/vagues (client) |
| `stands/{id}/history` | Compte Google authentifié    | Tout utilisateur authentifié                         |
| `queue`               | Tout utilisateur authentifié | Chacun son propre document                           |

## Déploiement

Le déploiement Vercel se déclenche au **push sur la branche `deploy`**. `main` est la branche d'intégration (revue par PR) ; on y reporte les changements avant de mettre à jour `deploy`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Importer le repo sur Vercel et renseigner les variables `VITE_FIREBASE_*` (et `VITE_ADMIN_EMAIL`).
