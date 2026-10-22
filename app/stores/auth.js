// Sesi login. Disimpan di localStorage agar tetap masuk saat halaman dimuat ulang atau dibuka
// di tab baru, sampai token kedaluwarsa (default backend 7 hari) atau pengguna keluar.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useDataStore } from "./data.js";

const STORAGE_KEY = "ditsama-session";

// waktu kedaluwarsa (ms) dari payload JWT; token rusak dianggap kedaluwarsa
function expiresAt(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return (payload.exp || 0) * 1000;
  } catch {
    return 0;
  }
}
const isExpired = (session) => !session || expiresAt(session.token) <= Date.now();

export const useAuthStore = create(persist((set) => ({
  // { id, name, email, role: { id, name, grants, programs, isSuperAdmin }, permissions, token }
  // permissions dari backend; diperbarui lewat GET /auth/me agar perubahan peran langsung berlaku
  session: null,
  notice: "",   // pesan untuk gerbang login (mis. sesi berakhir, menunggu persetujuan)

  login: (user, token) => {
    useDataStore.getState().reset();
    set({ session: { ...user, token }, notice: "" });
  },
  setUser: (user) => set((s) => ({ session: s.session && { ...s.session, ...user } })),
  logout: (notice = "") => {
    set({ session: null, notice });
    useDataStore.getState().reset();
  },
}), {
  name: STORAGE_KEY,
  storage: createJSONStorage(() => localStorage),
  partialize: (s) => ({ session: s.session }),
  // sesi tersimpan yang sudah kedaluwarsa dibuang saat dimuat
  merge: (saved, current) => {
    // sesi versi lama (dengan Password Akses): pakai token login, peran dimuat ulang lewat /auth/me
    const session = saved?.session && { ...saved.session, token: saved.session.token || saved.session.loginToken };
    if (!session) return { ...current, session: null };
    if (!isExpired(session)) return { ...current, session };
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* penyimpanan diblokir */ }
    return { ...current, session: null, notice: "Sesi Anda berakhir. Silakan masuk lagi." };
  },
}));

// masuk/keluar di tab lain langsung berlaku di tab ini
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const before = useAuthStore.getState().session?.email;
    useAuthStore.persist.rehydrate();
    if (useAuthStore.getState().session?.email !== before) useDataStore.getState().reset();
  });
}
