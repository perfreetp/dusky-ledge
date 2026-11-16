import { writable } from 'svelte/store';
import { STORAGE_KEYS } from '../config';
import type { UserRole } from '../types';

function loadRole(): UserRole {
  try {
    return (localStorage.getItem(STORAGE_KEYS.session) as UserRole) || 'maker';
  } catch {
    return 'maker';
  }
}

export const role = writable<UserRole>(loadRole());

role.subscribe((r) => {
  try {
    localStorage.setItem(STORAGE_KEYS.session, r);
  } catch {
    /* ignore */
  }
});
