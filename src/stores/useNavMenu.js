// Stato globale del drawer di navigazione (hamburger menu).
// Volatile (non persiste) — il drawer si chiude al refresh.

import { create } from 'zustand'

export const useNavMenu = create((set, get) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
  close: () => set({ open: false }),
}))
