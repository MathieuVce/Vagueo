# CLAUDE.md — Vaguéo

File d'attente virtuelle pour stands/marchands. Le client scanne un QR, rejoint la
file depuis son téléphone, et reçoit une notification quand c'est bientôt son tour.
Trois rôles : **client** (anonyme), **vendeur** (Google), **admin** (Google).
100 % front : React + Firestore temps réel, pas de backend applicatif.

## Stack & commandes

- **React 18**, **TypeScript 6 strict**, **Vite 8**, **Tailwind v4**, **Firebase/Firestore**, **Vitest**.
- `npm run dev` — dev local. `npm run build` — `tsc --noEmit && vite build`.
- `npm run typecheck` — `tsc --noEmit`. `npm run lint` (ESLint) · `npm run format` (Prettier, `format:check` pour vérifier).
- `npm test` — Vitest watch. `vitest run` — une passe. Ciblé : `test:hooks`, `test:pages`, `test:screens`, `test:ui`, `test:components`, `test:flows`. `npm run coverage`.
- `npm run check` — `typecheck && lint && vitest run` (porte de qualité complète).

**Boucle de vérif après une modif** (rapide, autonome) : `npx tsc --noEmit` → `npm run lint` → `vitest run` (au moins le dossier touché). Un **hook PostToolUse** lance déjà `tsc --noEmit` automatiquement après chaque édition `.ts/.tsx` (voir [.claude/settings.json](.claude/settings.json)) et te renvoie les erreurs. Ne conclure « fait » qu'après une vérif **verte**.

## Comment travailler ici (lis ça avant d'explorer)

- **Langue : commentaires et textes UI en français.** Garde ce style.
- Va **directement** au bon fichier via la carte d'archi ci-dessous plutôt que de grep large. Un sujet = un fichier.
- Le rendu est un MVP **monovendeur par URL** : `?stand=<id>` sélectionne le stand (voir `STAND_ID` dans [src/tokens.ts](src/tokens.ts)). Le routage se fait par `pathname` dans [src/App.tsx](src/App.tsx) : `/admin` → AdminApp, `/vendor` → VendorApp, sinon ClientApp.
- **Firestore est mocké dans les tests** ([src/test/setup.ts](src/test/setup.ts)) : `firebase/firestore`, `firebase/auth` et `../firebase` sont remplacés par des stubs `vi.fn()`. Pour tester un comportement BDD, on asserte les appels (`expect(updateDoc).toHaveBeenCalledWith(...)`, `expect(deleteDoc).toHaveBeenCalled()`), pas une vraie base.
- Régles de sécurité Firestore dans [firestore.rules](firestore.rules) — à garder synchro avec les écritures côté client (un client anonyme ne peut écrire qu'un sous-ensemble de champs).

## Autonomie & économie de tokens

Principe : **agir, se vérifier soi-même, ne demander que les vrais choix produit.**

- **Se vérifier sans déléguer** : boucle `tsc --noEmit` → `lint` → `vitest run`. Le hook renvoie déjà les erreurs `tsc` après chaque édition.
- **Décider avec des défauts raisonnables** quand le code/les conventions tranchent ; réserver les questions à l'utilisateur aux vrais arbitrages produit (UX, comportement attendu).
- **Lectures ciblées** : lire uniquement la portion utile (offset/limit), pas le fichier entier ; ne pas relire un fichier qu'on vient d'éditer ; ne jamais lire/grepper les chemins exclus (section suivante).
- **Paralléliser** les appels d'outils indépendants dans un même tour.
- **Diffs petits et ciblés** ; ne jamais régénérer un fichier > 30 lignes — produire uniquement les blocs modifiés. Le reformatage Prettier de masse se committe à part (`chore: format`).
- **Réponses concises** : pas d'intro ni de politesse, droit au code/commande. Clore par un **récap de 1 à 3 lignes** : ce qui a changé + état des vérifs (tsc/lint/test).

## Commits

- **Conventional Commits**, format `<type>(<scope>): <description>`. Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Descriptions en **français** (cohérent avec l'historique).
- **Jamais de trailer `Co-Authored-By`** ni mention d'assistant dans les messages.
- **Corps de PR** : pas d'emojis, pas de footer « Generated with… », pas de checklist. Phrases simples : contexte puis changements.
- Hooks Git automatiques : **pre-commit** (husky + lint-staged) formate/lint les fichiers stagés ; **commit-msg** (commitlint) valide le format. Pas besoin de formater à la main.
- Push sur `main` = **déploiement Vercel automatique** : ne pousser sur `main` qu'à la demande explicite de l'utilisateur.

## Fichiers d'exclusion stricts

Définis dans [.claude/settings.json](.claude/settings.json) (`permissions.deny`) — l'équivalent d'un `.claudeignore`.
**Ne jamais lire ni grepper** : `node_modules/**`, `dist/**`, `coverage/**`, `.vercel/**`, `.firebase/**`, `package-lock.json`, `*.tsbuildinfo`, `*.map`.

## Règles architecturales

- **Un sujet = un fichier** ; respecter les dossiers : `pages/` (un par rôle), `screens/` (écrans plein cadre), `components/` (briques visuelles), `ui/` (primitives de design), `hooks/` (logique + Firestore).
- **Toute la logique Firestore vit dans les hooks** (`use*.ts`), jamais dans les écrans. Les écrans reçoivent données + callbacks en props.
- `tokens.ts` est la **source unique** des constantes et des calculs (couleurs, `STAND_ID`, `calcMinPerPerson`, seuils EMA/wave). Ne pas dupliquer ces valeurs.
- Réutiliser les primitives `ui/` (Button, Field, Segment, Toggle, Drawer, Toast) plutôt que refaire des éléments stylés à la main.
- **Textes affichés** : préférer `/`, `·`, `…` aux tirets cadratin/demi-cadratin (`—`/`–`). Convention douce, non bloquée par le linter.
- `npx tsc --noEmit` doit passer (TS strict). Pas de code mort.

## Architecture

```
src/
  main.tsx              Bootstrap React + enregistrement du service worker (push)
  App.tsx               Routage par pathname (/admin, /vendor, sinon client) + ErrorBoundary
  firebase.ts           Init Firebase : exporte db (Firestore) et auth
  tokens.ts             Source unique : STAND_ID, palette, constantes (WAVE_SIZE, EMA_ALPHA,
                        CALL_AHEAD_MIN_DEFAULT…) et calculs (calcMinPerPerson, waveIntervalMs…)
  types.ts              Stand · QueueEntry · HistoryEntry · ExitReason

  pages/                Un point d'entrée par rôle
    ClientApp.tsx       Parcours client : splash → attente → check-in → validation → merci
    VendorApp.tsx       Console vendeur : auth Google, liaison du stand, file en direct, auto-advance
    AdminApp.tsx        Back-office : création/édition de stands, liaison vendeur, accès stats

  hooks/                Logique métier + accès Firestore (tout l'I/O BDD est ici)
    useClientSession.ts Session client anonyme : auth, position en file, join/delay/leave/done,
                        déclenchement « orange » basé sur le temps, apprentissage EMA via transaction
    useStand.ts         Lecture/écriture du stand : advance, setFlowRate (reset EMA), configure, claimStand
    useVendorAuth.ts    Auth Google vendeur : isOwner / isUnclaimed / isAuthorized
    useVendorStandLookup.ts  Retrouve le stand d'un vendeur connecté sans ?stand= dans l'URL
    useQueueCounts.ts   Comptage temps réel (présents / en attente) côté vendeur
    useDevHelpers.ts    Outils dev (ajout/retrait/purge de clients factices)
    useClock.ts         Horloge partagée. usePush.ts  Permissions + notifications push (SW)

  screens/              Écrans plein cadre (présentation pure, pilotés par les pages)
    Client : ScreenSplash · ScreenAttente · ScreenCheckin · ScreenValidation · ScreenMerci
    Vendeur: ScreenVendor · ScreenVendorLogin · ScreenVendorCreate · ScreenVendorSetup
             ScreenStats · ScreenQRCode
    Divers : DevModeChoice

  components/           Briques visuelles : ErrorBoundary, ModalDialog, ModalRating,
                        RippleCanvas, SecureColorBg, VagueoLogo, VgButton, WaveBackground
  ui/                   Primitives de design (barrel index.ts) : Button, Drawer, Field, Label,
                        Segment, Toast, Toggle + design.ts (tokens visuels)
  test/setup.ts         Mocks Vitest (firebase, firestore, auth, matchMedia, ResizeObserver)
```

## Modèle de données Firestore

- **`stands/{standId}`** — config + état temps réel d'un stand : `is_open`, `is_paused`, `current_wave`,
  `queue_counter`, débit (`flow_rate`, `flow_slow`, `flow_sprint`, `min_per_person`), apprentissage
  (`service_ms_ema`, `service_count`), liaison vendeur (`vendor_uid`, `vendor_email`), `status`.
- **`queue/{uid}`** — un doc par client en file (clé = uid anonyme). Supprimé à la sortie
  (`leave`/`done`/`restart` font un `deleteDoc`, pas un `status: done`). Champs : `queue_position`,
  `status` (`waiting`|`orange`|`claimed`|`done`), `stand_id`, horodatages.
- **`stands/{standId}/history/{id}`** — archive d'un service terminé (pour les stats). Écrit **avant**
  la suppression du doc queue, dans la transaction qui met à jour l'EMA.

## Parcours client (étapes, `useClientSession`)

`loading` → `splash` (pas en file) → `waiting` (en file) → `checkin` (statut `orange`,
« c'est bientôt ton tour ») → `validation` (statut `claimed`, au stand) → service terminé.
Le passage en **orange** se déclenche quand `temps d'attente estimé ≤ call_ahead_min × 1.3`
(et non plus à un comptage fixe).

## Pièges (journal vivant)

> À chaque acquis non évident (gotcha, décision d'archi, piège résolu), ajouter une puce ici
> plutôt que de le re-déduire à la prochaine session. Court et actionnable.

- `positionAhead` initialisé à `null` (pas `0`) : `null` = requête pas encore revenue, `0` = vraiment
  premier. Distinguer les deux évite un faux passage en orange au premier rendu.
- Sorties de file = `deleteDoc` (jamais `status: done`) sinon la collection `queue` accumule des docs
  morts. Les stats lisent l'historique, pas la file, donc rien à craindre côté chiffres.
- Apprentissage EMA : `setFlowRate` (bouton ± affluence) **réinitialise** l'EMA (`deleteField` +
  `service_count: 0`) pour que le slider reprenne effet immédiat.
- Règles Firestore : un client anonyme ne peut écrire que `queue_counter`, `rating_*` et les champs EMA
  sur le stand ; il ne peut supprimer que **son** doc queue. Garder [firestore.rules](firestore.rules)
  synchro avec toute nouvelle écriture client.
- Liaison vendeur : un compte Google ne peut écraser `vendor_uid` que si le stand n'est pas déjà lié
  (anti-vol de stand) ; `deleteField()` (déliaison admin) reste autorisé.
