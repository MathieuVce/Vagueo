import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, deleteField } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

// Contextes d'auth : on distingue client anonyme (sign_in_provider = 'anonymous')
// et vendeur/admin Google (sign_in_provider = 'google.com'), car les règles s'en servent.
const anon = (uid: string) =>
  testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const google = (uid: string) =>
  testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
// Admin réel : custom claim `admin` (posé hors bande via scripts/set-admin-claim.mjs).
const admin = (uid: string) =>
  testEnv
    .authenticatedContext(uid, { admin: true, firebase: { sign_in_provider: 'google.com' } })
    .firestore();

// Seed sans passer par les règles
async function seed(path: [string, string], data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path[0], path[1]), data);
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-vagueo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Règles Firestore · stands', () => {
  it('lecture publique autorisée', async () => {
    await seed(['stands', 's1'], { name: 'Stand', is_open: true });
    await assertSucceeds(getDoc(doc(anon('alice'), 'stands', 's1')));
  });

  it('client anonyme : peut faire avancer l’assemblage de vague (fill_*)', async () => {
    await seed(['stands', 's1'], { name: 'Stand', fill_wave: 0, fill_count: 0 });
    await assertSucceeds(updateDoc(doc(anon('alice'), 'stands', 's1'), { fill_count: 1 }));
  });

  it('client anonyme : ne peut plus écrire queue_counter (retiré de la whitelist)', async () => {
    await seed(['stands', 's1'], { name: 'Stand', queue_counter: 0 });
    await assertFails(updateDoc(doc(anon('alice'), 'stands', 's1'), { queue_counter: 1 }));
  });

  it('client anonyme : ne peut pas modifier un champ arbitraire (name)', async () => {
    await seed(['stands', 's1'], { name: 'Stand' });
    await assertFails(updateDoc(doc(anon('alice'), 'stands', 's1'), { name: 'Pirate' }));
  });

  // E — bornage des notes / EMA
  it('client anonyme : note valide (incrément 1 / +1..5) autorisée', async () => {
    await seed(['stands', 's1'], {
      name: 'Stand',
      rating_count: 0,
      rating_sum: 0,
      min_per_person: 3,
    });
    await assertSucceeds(
      updateDoc(doc(anon('alice'), 'stands', 's1'), { rating_count: 1, rating_sum: 4 }),
    );
  });

  it('client anonyme : note gonflée (rating_sum hors +1..5) refusée', async () => {
    await seed(['stands', 's1'], {
      name: 'Stand',
      rating_count: 0,
      rating_sum: 0,
      min_per_person: 3,
    });
    await assertFails(
      updateDoc(doc(anon('alice'), 'stands', 's1'), { rating_count: 1, rating_sum: 100 }),
    );
  });

  it('client anonyme : min_per_person hors bornes [0,60] refusé', async () => {
    await seed(['stands', 's1'], {
      name: 'Stand',
      min_per_person: 3,
      service_ms_ema: 180000,
      service_count: 5,
    });
    await assertFails(updateDoc(doc(anon('alice'), 'stands', 's1'), { min_per_person: 999 }));
  });

  // A / C — isolation entre vendeurs, suppression réservée à l’admin
  it('Google non-propriétaire non-admin : ne peut pas modifier le stand d’un autre', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner', is_open: false });
    await assertFails(updateDoc(doc(google('intrus'), 'stands', 's1'), { is_open: true }));
  });

  it('admin : peut modifier n’importe quel stand', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner', is_open: false });
    await assertSucceeds(updateDoc(doc(admin('boss'), 'stands', 's1'), { is_open: true }));
  });

  it('Google non-admin : ne peut pas supprimer un stand', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner' });
    await assertFails(deleteDoc(doc(google('owner'), 'stands', 's1')));
  });

  it('admin : peut supprimer un stand', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner' });
    await assertSucceeds(deleteDoc(doc(admin('boss'), 'stands', 's1')));
  });

  it('client anonyme : ne peut pas créer un stand', async () => {
    await assertFails(setDoc(doc(anon('alice'), 'stands', 'sX'), { name: 'Faux' }));
  });
});

describe('Règles Firestore · liaison vendeur', () => {
  it('Google : peut revendiquer un stand non lié (vendor_uid vide)', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_email: 'v@test.com' });
    await assertSucceeds(
      updateDoc(doc(google('vendor1'), 'stands', 's1'), {
        vendor_uid: 'vendor1',
        vendor_email: 'v@test.com',
      }),
    );
  });

  it('Google tiers : ne peut PAS écraser le vendor_uid d’un stand déjà lié', async () => {
    await seed(['stands', 's1'], {
      name: 'Stand',
      vendor_uid: 'owner',
      vendor_email: 'o@test.com',
    });
    await assertFails(updateDoc(doc(google('pirate'), 'stands', 's1'), { vendor_uid: 'pirate' }));
  });

  it('propriétaire : peut modifier son stand lié', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner', is_open: false });
    await assertSucceeds(updateDoc(doc(google('owner'), 'stands', 's1'), { is_open: true }));
  });

  it('admin : peut délier (deleteField vendor_uid) un stand lié', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner', is_open: true });
    await assertSucceeds(
      updateDoc(doc(admin('boss'), 'stands', 's1'), { vendor_uid: deleteField() }),
    );
  });

  // B — vol en deux temps : déliaison réservée à l’admin (sinon reclaim possible)
  it('Google non-admin : ne peut PAS délier un stand (deleteField vendor_uid)', async () => {
    await seed(['stands', 's1'], {
      name: 'Stand',
      vendor_uid: 'owner',
      vendor_email: 'o@test.com',
    });
    await assertFails(
      updateDoc(doc(google('pirate'), 'stands', 's1'), { vendor_uid: deleteField() }),
    );
  });
});

describe('Règles Firestore · file d’attente', () => {
  // Doc queue valide à l’arrivée (forme imposée par isValidInitial).
  const initial = (over: Record<string, unknown> = {}) => ({
    uid: 'alice',
    stand_id: 's1',
    status: 'waiting',
    wave_number: 0,
    delay_used: false,
    has_confirmed_presence: false,
    ...over,
  });

  it('client anonyme : crée son propre doc (forme valide)', async () => {
    await seed(['stands', 's1'], { current_wave: 0 });
    await assertSucceeds(setDoc(doc(anon('alice'), 'queue', 'alice'), initial()));
  });

  it('client anonyme : ne peut pas créer le doc d’un autre', async () => {
    await assertFails(setDoc(doc(anon('alice'), 'queue', 'bob'), initial({ uid: 'bob' })));
  });

  // D — anti-triche à la création
  it('client anonyme : ne peut pas naître directement en claimed', async () => {
    await seed(['stands', 's1'], { current_wave: 0 });
    await assertFails(setDoc(doc(anon('alice'), 'queue', 'alice'), initial({ status: 'claimed' })));
  });

  it('client anonyme : ne peut pas naître sur une vague passée', async () => {
    await seed(['stands', 's1'], { current_wave: 5 });
    await assertFails(setDoc(doc(anon('alice'), 'queue', 'alice'), initial({ wave_number: 2 })));
  });

  // D — anti-triche aux transitions
  it('client anonyme : waiting → claimed sans passer par orange refusé', async () => {
    await seed(['stands', 's1'], { current_wave: 0, vendor_uid: '' });
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'waiting',
      wave_number: 3,
    });
    await assertFails(
      updateDoc(doc(anon('alice'), 'queue', 'alice'), { status: 'claimed', claimed_at: 1 }),
    );
  });

  it('client anonyme : passage orange à vague lointaine refusé', async () => {
    await seed(['stands', 's1'], { current_wave: 0, vendor_uid: '' });
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'waiting',
      wave_number: 5,
    });
    await assertFails(
      updateDoc(doc(anon('alice'), 'queue', 'alice'), { status: 'orange', called_at: 1 }),
    );
  });

  it('client anonyme : ne peut pas abaisser sa wave_number (saut de file)', async () => {
    await seed(['stands', 's1'], { current_wave: 0, vendor_uid: '' });
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'waiting',
      wave_number: 5,
    });
    await assertFails(updateDoc(doc(anon('alice'), 'queue', 'alice'), { wave_number: 2 }));
  });

  it('client anonyme : ne peut pas réinitialiser delay_used', async () => {
    await seed(['stands', 's1'], { current_wave: 0, vendor_uid: '' });
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'waiting',
      wave_number: 5,
      delay_used: true,
    });
    await assertFails(updateDoc(doc(anon('alice'), 'queue', 'alice'), { delay_used: false }));
  });

  // Anti-régression : le parcours légitime reste autorisé
  it('client anonyme : heartbeat last_seen seul autorisé', async () => {
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'waiting',
      wave_number: 3,
    });
    await assertSucceeds(updateDoc(doc(anon('alice'), 'queue', 'alice'), { last_seen: 123 }));
  });

  it('client anonyme : passage orange à une vague proche autorisé', async () => {
    await seed(['stands', 's1'], { current_wave: 0, vendor_uid: '' });
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'waiting',
      wave_number: 1,
    });
    await assertSucceeds(
      updateDoc(doc(anon('alice'), 'queue', 'alice'), { status: 'orange', called_at: 1 }),
    );
  });

  it('client anonyme : orange → claimed (confirmPresence) autorisé', async () => {
    await seed(['stands', 's1'], { current_wave: 0, vendor_uid: '' });
    await seed(['queue', 'alice'], {
      uid: 'alice',
      stand_id: 's1',
      status: 'orange',
      wave_number: 1,
    });
    await assertSucceeds(
      updateDoc(doc(anon('alice'), 'queue', 'alice'), {
        status: 'claimed',
        has_confirmed_presence: true,
        claimed_at: 1,
      }),
    );
  });

  it('client anonyme : supprime son propre doc', async () => {
    await seed(['queue', 'alice'], { uid: 'alice', stand_id: 's1', status: 'waiting' });
    await assertSucceeds(deleteDoc(doc(anon('alice'), 'queue', 'alice')));
  });

  it('client anonyme : ne peut pas supprimer le doc d’un autre', async () => {
    await seed(['queue', 'bob'], { uid: 'bob', stand_id: 's1', status: 'waiting' });
    await assertFails(deleteDoc(doc(anon('alice'), 'queue', 'bob')));
  });

  it('vendeur du stand : peut supprimer un doc de sa file (reaper)', async () => {
    await seed(['stands', 's1'], { vendor_uid: 'owner' });
    await seed(['queue', 'bob'], { uid: 'bob', stand_id: 's1', status: 'claimed' });
    await assertSucceeds(deleteDoc(doc(google('owner'), 'queue', 'bob')));
  });
});

describe('Règles Firestore · historique', () => {
  // F — injection d’historique
  it('client anonyme : crée SA propre entrée (note valide)', async () => {
    await assertSucceeds(
      setDoc(doc(anon('alice'), 'stands', 's1', 'history', 'h1'), {
        uid: 'alice',
        exit_reason: 'completed',
        rating: 5,
      }),
    );
  });

  it('client anonyme : ne peut pas créer l’entrée d’un autre uid', async () => {
    await assertFails(setDoc(doc(anon('alice'), 'stands', 's1', 'history', 'h1'), { uid: 'bob' }));
  });

  it('client anonyme : note hors bornes refusée', async () => {
    await assertFails(
      setDoc(doc(anon('alice'), 'stands', 's1', 'history', 'h1'), { uid: 'alice', rating: 9 }),
    );
  });

  // H (lecture) — historique réservé au propriétaire / admin
  it('propriétaire : lit l’historique de son stand', async () => {
    await seed(['stands', 's1'], { vendor_uid: 'owner' });
    await seed(['stands/s1/history', 'h1'], { uid: 'x', exit_reason: 'completed' });
    await assertSucceeds(getDoc(doc(google('owner'), 'stands', 's1', 'history', 'h1')));
  });

  it('Google tiers : ne peut pas lire l’historique d’un autre stand', async () => {
    await seed(['stands', 's1'], { vendor_uid: 'owner' });
    await seed(['stands/s1/history', 'h1'], { uid: 'x', exit_reason: 'completed' });
    await assertFails(getDoc(doc(google('intrus'), 'stands', 's1', 'history', 'h1')));
  });
});
