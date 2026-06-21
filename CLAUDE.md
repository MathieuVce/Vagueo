# CLAUDE.md — Vaguéo

File d'attente virtuelle pour stands/marchands. Le client scanne un QR, rejoint la
file depuis son téléphone, et reçoit une notification quand c'est bientôt son tour.
Trois rôles : **client** (anonyme), **vendeur** (Google), **admin** (Google).
100 % front : React + Firestore temps réel, pas de backend applicatif.

## Stack & commandes

- **React 18**, **TypeScript 6 strict**, **Vite 8**, **Tailwind v4**, **Firebase/Firestore**, **Vitest**.
- `npm run dev` — dev local. `npm run build` — `tsc --noEmit && vite build`.
- `npm run typecheck` — `tsc --noEmit`. `npm run lint` (ESLint) · `npm run format` (Prettier, `format:check` pour vérifier).
- `npm test` — Vitest watch. `vitest run` — une passe. Ciblé : `test:hooks`, `test:pages`, `test:screens`, `test:ui`, `test:components`, `test:flows`, `test:wave` (maths de vague + attente selon affluence, `test:wave:watch` en continu). `npm run coverage`.
- `npm run test:rules` — tests des règles Firestore contre l'émulateur (Java requis). Vit dans `tests/`, config séparée [vitest.rules.config.ts](vitest.rules.config.ts) sans les mocks.
- `npm run knip` — détecte exports / dépendances / fichiers morts (audit manuel, pas dans la CI).
- `npm run check` — `typecheck && lint && vitest run` (porte de qualité complète, aussi lancée par le hook **pre-push**).

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
- **Éditer par diff, pas par réécriture** : `Edit`/`MultiEdit` par défaut. `Write` est réservé aux **fichiers neufs** ou très courts (≤ 30 lignes). Un **hook PreToolUse** ([.claude/hooks/write-guard.sh](.claude/hooks/write-guard.sh)) bloque tout `Write` qui écraserait un fichier existant de plus de 30 lignes → repasser par `Edit`.
  - `old_string` minimal mais unique : la plus petite ancre qui identifie l'emplacement, sans recopier les lignes alentour inchangées.
  - Ne pas toucher imports/fonctions/blocs hors du changement ; ne pas réindenter ni reformater au passage (Prettier s'en charge au commit).
  - Plusieurs petites éditions ciblées valent mieux qu'une grosse réécriture. Le reformatage de masse se committe à part (`chore: format`).
- **Réponses concises** : pas d'intro ni de politesse, droit au code/commande. Clore par un **récap de 1 à 3 lignes** : ce qui a changé + état des vérifs (tsc/lint/test).

## Commits

- **Conventional Commits**, format `<type>(<scope>): <description>`. Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Descriptions en **français** (cohérent avec l'historique).
- **Noms de branches en anglais** (kebab-case), préfixe conventionnel : `feat/…`, `fix/…`, `chore/…`, etc. Ex. : `feat/wave-model`, `fix/orange-trigger`. (Les messages de commit restent en français, seuls les noms de branches sont en anglais.)
- **Jamais de trailer `Co-Authored-By`** ni mention d'assistant dans les messages.
- **Corps de PR** : pas d'emojis, pas de footer « Generated with… », pas de checklist. Phrases simples : contexte puis changements.
- Hooks Git automatiques : **pre-commit** (husky + lint-staged) formate/lint les fichiers stagés ; **commit-msg** (commitlint) valide le format ; **pre-push** lance `npm run check`. Pas besoin de formater à la main.
- **Déploiement Vercel = push sur la branche `deploy`** (déclenche le build/déploiement automatique). `main` est la branche d'intégration (revue par PR). Ne pousser sur `main` ou `deploy` qu'à la demande explicite de l'utilisateur.

## Fichiers d'exclusion stricts

Définis dans [.claude/settings.json](.claude/settings.json) (`permissions.deny`) — l'équivalent d'un `.claudeignore`.
**Ne jamais lire ni grepper** : `node_modules/**`, `dist/**`, `coverage/**`, `.vercel/**`, `.firebase/**`, `package-lock.json`, `*.tsbuildinfo`, `*.map`.

## Règles architecturales

- **Un sujet = un fichier** ; respecter les dossiers : `pages/` (un par rôle), `screens/` (écrans plein cadre), `components/` (briques visuelles), `ui/` (primitives de design), `hooks/` (logique + Firestore).
- **Toute la logique Firestore vit dans les hooks** (`use*.ts`), jamais dans les écrans. Les écrans reçoivent données + callbacks en props.
- `tokens.ts` est la **source unique** des constantes et des calculs (couleurs, `STAND_ID`, `calcMinPerPerson`, seuils EMA/wave). Ne pas dupliquer ces valeurs.
- Réutiliser les primitives `ui/` (Button, Field, Segment, Toggle, Drawer, Toast) plutôt que refaire des éléments stylés à la main.
- **Textes affichés** : **interdit** d'écrire un tiret cadratin (`—`) ou demi-cadratin (`–`) dans le texte affiché (titres, labels, JSX, placeholders) ; utiliser `/`, `·` ou `…`. **Règle ESLint** `no-restricted-syntax` (erreur) sur `src/**` hors tests. Le tiret simple `-` reste autorisé (calculs, kebab-case, URLs, mots composés français).
- `npx tsc --noEmit` doit passer (TS strict). Pas de code mort.
- **Promesses** : règle ESLint type-aware `no-floating-promises`. Un appel async non attendu (souvent un `updateDoc`/`deleteDoc` Firestore en fire-and-forget dans un effet ou un handler) doit être préfixé par `void`, sinon `await` + gestion d'erreur.

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
    useQueueReaper.ts   Filet de sécurité vendeur : purge les fantômes (onglet fermé sans clic)
    useDevHelpers.ts    Outils dev : +/- clients factices, +/- attente (avance/recul de current_wave), purge
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

- **`stands/{standId}`** — config + état temps réel d'un stand : `is_open`, `is_paused`, `current_wave`
  (vague en cours de passage, avancée auto par le vendeur), `fill_wave`/`fill_count` (vague en cours
  d'assemblage + remplissage, plafond `WAVE_SIZE`), `queue_counter` (legacy), débit (`flow_rate`,
  `flow_slow`, `flow_sprint`, `min_per_person`), apprentissage (`service_ms_ema`, `service_count`),
  liaison vendeur (`vendor_uid`, `vendor_email`), `status`.
- **`queue/{uid}`** — un doc par client en file (clé = uid anonyme). Supprimé à la sortie
  (`leave`/`done`/`restart` font un `deleteDoc`, pas un `status: done`). Champs : `wave_number` (sa vague,
  fixée à l'arrivée), `status` (`waiting`|`orange`|`claimed`|`done`), `stand_id`, `last_seen`, horodatages.
- **`stands/{standId}/history/{id}`** — archive d'un service terminé (pour les stats). Écrit **avant**
  la suppression du doc queue, dans la transaction qui met à jour l'EMA.

## Modèle par vagues (pas de numéro individuel)

Le client ne reçoit **pas** de position/numéro : il rejoint une **vague**, et c'est la vague entière
qui passe. Affectation **hybride** (`join`) : la vague d'assemblage suit `current_wave` (fenêtre de
temps), plafonnée à `WAVE_SIZE` (le surplus déborde sur la vague suivante). `WAVE_LEAD = 0` → la vague
d'assemblage **est** `current_wave`, donc « groupe servi = `current_wave` », le premier groupe = vague 0,
et `wavesAhead` n'est pas gonflé (estimations justes). Avance **auto** : le vendeur incrémente
`current_wave` toutes les `waveIntervalMs`. La couleur anti-fraude (`secure_color`) tourne par vague →
tous les membres d'une vague affichent la même quand c'est leur tour.

## Parcours client (étapes, `useClientSession`)

`loading` → `splash` (pas en file) → `waiting` (en file) → `checkin` (statut `orange`,
« c'est bientôt ton tour ») → `validation` (statut `claimed`, au stand) → service terminé.
Le passage en **orange** se déclenche « une vague à l'avance » : quand
`wave_number − current_wave ≤ CALL_AHEAD_WAVES` (= 1). Attente estimée = `wavesAhead × WAVE_SIZE ×
min_per_person`. Décaler (`requestDelay`) repousse de `DELAY_WAVES` vague(s).

## Pièges (journal vivant)

> À chaque acquis non évident (gotcha, décision d'archi, piège résolu), ajouter une puce ici
> plutôt que de le re-déduire à la prochaine session. Court et actionnable.

- Modèle par vagues : `wavesAhead = wave_number − current_wave` (calcul direct, plus de requête
  « personnes devant »). Orange dès `wavesAhead ≤ CALL_AHEAD_WAVES`. `join` est une transaction qui
  affecte la vague via `fill_wave`/`fill_count` (repart de `current_wave + WAVE_LEAD` quand la vague a
  avancé = nouvelle fenêtre de temps ; déborde sur la vague suivante au-delà de `WAVE_SIZE`).
- Test dev rapide (un seul onglet) : en `npm run dev`, une barre DEV sur l'écran **client** (boutons
  Bleu / Orange / Validation) force le statut de sa propre session via `actions.devSet` (édite son doc
  queue, autorisé par les règles). Masquée en prod et en test (`import.meta.env.MODE !== 'test'`). Côté
  vendeur, `− attente / + attente` font avancer/reculer `current_wave` pour piloter un onglet client tiers.
- Conséquence du « avance auto seule » : la cadence est fixe (`waveIntervalMs`), donc un client seul peut
  attendre ~une vague avant d'être servi. Pour réduire ce délai, baisser `min_per_person` (slider) ou
  réintroduire une avance manuelle vendeur.
- Sorties de file = `deleteDoc` (jamais `status: done`) sinon la collection `queue` accumule des docs
  morts. Les stats lisent l'historique, pas la file, donc rien à craindre côté chiffres.
- Apprentissage EMA : `setFlowRate` (bouton ± affluence) **réinitialise** l'EMA (`deleteField` +
  `service_count: 0`) pour que le slider reprenne effet immédiat.
- EMA bornée : un service mesuré au-delà de `EMA_OUTLIER_FACTOR` × (EMA en place, ou base du slider au
  démarrage) est **plafonné** avant d'alimenter la moyenne — un client qui laisse l'écran ouvert sans
  cliquer « terminé » ne pollue plus le calcul.
- Nettoyage des fantômes : le self-timeout client ([ClientApp](src/pages/ClientApp.tsx)) n'agit que si
  l'onglet du client est ouvert. [useQueueReaper](src/hooks/useQueueReaper.ts) (session vendeur, droits
  Google) purge en dernier recours les « claimed » jamais terminés, les « orange » sans réponse, et les
  « waiting » abandonnés (`WAITING_STALE_MS`, délai très long). Écrit un `timeout_*` dans l'historique
  (`timeout_service`/`timeout_checkin`/`timeout_waiting`) puis `deleteDoc`. Pas de backend.
- Heartbeat de présence : tant qu'il est en file et que l'onglet est visible, le client rafraîchit
  `last_seen` toutes les `HEARTBEAT_INTERVAL_MS` ([useClientSession](src/hooks/useClientSession.ts)). Le
  reaper s'en sert en priorité : un onglet vif (`last_seen` < `HEARTBEAT_STALE_MS`) n'est **jamais** purgé
  (protège un service long), un « claimed » muet l'est en quelques minutes. Repli sur les seuils coarse
  (claimed_at/called_at/timestamp) pour les clients sans heartbeat ou en arrière-plan (timers bridés).
  Aucune règle Firestore à changer : le client peut déjà écrire son propre doc queue.
- Règles Firestore : un client anonyme ne peut écrire que `queue_counter`, `rating_*` et les champs EMA
  sur le stand ; il ne peut supprimer que **son** doc queue. Garder [firestore.rules](firestore.rules)
  synchro avec toute nouvelle écriture client.
- Liaison vendeur : un compte Google ne peut écraser `vendor_uid` que si le stand n'est pas déjà lié
  (anti-vol de stand) ; `deleteField()` (déliaison admin) reste autorisé.
