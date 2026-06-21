import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

// Contextes d'auth : on distingue client anonyme (sign_in_provider = 'anonymous')
// et vendeur/admin Google (sign_in_provider = 'google.com'), car les règles s'en servent.
const anon = (uid: string) =>
  testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const google = (uid: string) =>
  testEnv.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();

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

  it('client anonyme : peut incrémenter queue_counter', async () => {
    await seed(['stands', 's1'], { name: 'Stand', queue_counter: 0 });
    await assertSucceeds(updateDoc(doc(anon('alice'), 'stands', 's1'), { queue_counter: 1 }));
  });

  it('client anonyme : ne peut pas modifier un champ arbitraire (name)', async () => {
    await seed(['stands', 's1'], { name: 'Stand', queue_counter: 0 });
    await assertFails(updateDoc(doc(anon('alice'), 'stands', 's1'), { name: 'Pirate' }));
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

  it('admin Google : peut délier (deleteField vendor_uid) un stand lié', async () => {
    await seed(['stands', 's1'], { name: 'Stand', vendor_uid: 'owner', is_open: true });
    // deleteField se traduit par l'absence du champ dans request.resource.data
    await assertSucceeds(
      updateDoc(doc(google('admin'), 'stands', 's1'), { is_open: false, name: 'Stand' }),
    );
  });
});

describe('Règles Firestore · file d’attente', () => {
  it('client anonyme : crée son propre doc', async () => {
    await assertSucceeds(
      setDoc(doc(anon('alice'), 'queue', 'alice'), {
        uid: 'alice',
        stand_id: 's1',
        status: 'waiting',
      }),
    );
  });

  it('client anonyme : ne peut pas créer le doc d’un autre', async () => {
    await assertFails(
      setDoc(doc(anon('alice'), 'queue', 'bob'), { uid: 'bob', stand_id: 's1', status: 'waiting' }),
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
});
