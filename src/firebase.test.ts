import { describe, it, expect } from 'vitest';
import * as firebase from './firebase';

describe('firebase', () => {
  it('exports db, auth and storage', () => {
    expect(firebase.db).toBeDefined();
    expect(firebase.auth).toBeDefined();
    expect(firebase.storage).toBeDefined();
  });
});
