// Pembatasan halaman per jabatan (mengikuti hak akses backend).
import { Link } from "react-router";
import { canManageReports, canManageUsers, canSeeActivities, canSeeFinance, roleName } from "../lib/format.js";
import { useAuthStore } from "../stores/auth.js";
import { Icon } from "./Icon.jsx";
import { EmptyState } from "./ui.jsx";

export const ACCESS = {
  activities: { can: canSeeActivities, who: "pengguna yang sudah diberi akses" },
  finance: { can: canSeeFinance, who: "peran dengan akses Administrator, Viewer, Editor Finance, atau Viewer Finance" },
  reports: { can: canManageReports, who: "peran dengan akses Administrator" },
  accounts: { can: canManageUsers, who: "peran dengan akses Administrator" },
};

// halaman awal yang pasti bisa dibuka jabatan ini
export const homeOf = (s) => (canSeeActivities(s) ? ["/dashboard", "Portofolio Program"] : ["/dashboard/financial", "Keuangan"]);

/**
 * Tampilkan `children` bila jabatan boleh membuka halaman `area`; kalau tidak, tampilkan penjelasan.
 * `back` = [tujuan, label] tombol kembali; default halaman awal Pra-Universitas.
 */
export function RequireAccess({ area, page, back, children }) {
  const session = useAuthStore((s) => s.session);
  const rule = ACCESS[area];
  if (rule.can(session)) return children;
  const [to, label] = back || homeOf(session);
  return (
    <div className="page">
      <section className="card">
        <EmptyState icon="lock" title={`${page} tidak tersedia untuk jabatan Anda`}
          action={<Link className="btn btn-primary btn-sm" to={to}><Icon name="left" size={15} />Buka {label}</Link>}>
          Halaman ini hanya bisa dibuka oleh {rule.who}. Peran Anda: {roleName(session)}.
        </EmptyState>
      </section>
    </div>
  );
}
