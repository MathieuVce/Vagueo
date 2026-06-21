import { describe, it, expect } from 'vitest';
import * as firebase from './firebase';

describe('firebase', () => {
  it('exports db and auth', () => {
    expect(firebase.db).toBeDefined();
    expect(firebase.auth).toBeDefined();
  });
});
