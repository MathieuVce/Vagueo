// Cloud Function — sends Web Push notification to a client when their wave is reached.
// Deploy: firebase deploy --only functions
// Requires: Firebase Blaze plan + FCM enabled in your project.

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db  = admin.firestore();
const msg = admin.messaging();

// Triggers every time the stand document changes.
// If current_wave advanced, find clients whose wave_assigned == new current_wave
// and send them a push notification (requires their fcmToken stored in Firestore).
exports.notifyClientsOnWaveAdvance = onDocumentUpdated(
  'stands/{standId}',
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();

    // Only act when current_wave actually increases
    if (after.current_wave <= before.current_wave) return;

    const newWave = after.current_wave;

    // Find clients assigned to this wave who haven't confirmed yet
    const snap = await db.collection('queue')
      .where('wave_assigned', '==', newWave)
      .where('status', '==', 'waiting')
      .get();

    const tokens = snap.docs
      .map((d) => d.data().fcmToken)
      .filter(Boolean);

    if (tokens.length === 0) return;

    await msg.sendEachForMulticast({
      tokens,
      notification: {
        title: "C'est votre tour !",
        body: 'Approchez-vous du stand Vaguéo.',
      },
      webpush: {
        notification: { icon: '/icon-192.png', tag: 'vagueo-turn', renotify: true },
        fcmOptions: { link: '/' },
      },
    });
  }
);
