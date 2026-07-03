// Pose (ou retire) le custom claim `admin` sur un compte Google.
//
// Le rôle admin de Vaguéo est appliqué côté serveur par les règles Firestore
// (isAdmin() = request.auth.token.admin == true). Ce claim ne peut être posé
// que via l'Admin SDK, avec un service account — jamais depuis le navigateur.
//
// Prérequis (gratuit, pas de plan Blaze) :
//   - un service account JSON du projet visé (console Firebase → Paramètres →
//     Comptes de service → Générer une clé). NE PAS committer ce fichier.
//   - exporter GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json
//
// Usage :
//   GOOGLE_APPLICATION_CREDENTIALS=./sa-dev.json npm run set-admin -- admin@exemple.com
//   # email par défaut : $VITE_ADMIN_EMAIL
//   # retirer le claim : ... npm run set-admin -- admin@exemple.com --revoke
//
// À lancer une fois par projet (vagueo-dev et vagueo-c773c), AVANT de déployer
// les règles durcies (sinon l'admin se verrouille lui-même). Après exécution,
// l'admin doit se déconnecter/reconnecter pour rafraîchir son token.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv.find((a) => a.includes('@')) ?? process.env.VITE_ADMIN_EMAIL;
const revoke = process.argv.includes('--revoke');

if (!email) {
  console.error(
    'Email manquant. Usage : npm run set-admin -- admin@exemple.com [--revoke]\n' +
      '(ou définir VITE_ADMIN_EMAIL). GOOGLE_APPLICATION_CREDENTIALS doit pointer sur un service account.',
  );
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'GOOGLE_APPLICATION_CREDENTIALS non défini. Exporte le chemin du service account JSON du projet.',
  );
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);
  const claims = { ...(user.customClaims ?? {}), admin: revoke ? undefined : true };
  if (revoke) delete claims.admin;
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(
    `${revoke ? 'Claim admin retiré' : 'Claim admin posé'} pour ${email} (uid ${user.uid}).\n` +
      'Reconnexion nécessaire pour rafraîchir le token.',
  );
} catch (err) {
  console.error('Échec :', err.message ?? err);
  process.exit(1);
}
