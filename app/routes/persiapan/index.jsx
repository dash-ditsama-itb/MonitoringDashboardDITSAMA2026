import { Link, Navigate } from "react-router";
import { Icon } from "../../components/Icon.jsx";
import { reportPath, useReports } from "../../components/Reports.jsx";
import { EmptyState, ErrorNote, PageHead, SkeletonCard } from "../../components/ui.jsx";
import { canManageReports } from "../../lib/format.js";
import { useAuthStore } from "../../stores/auth.js";

// /pendidikan-persiapan -> laporan pertama; bila belum ada laporan, tampilkan keadaan kosong
export default function PersiapanHome() {
  const session = useAuthStore((s) => s.session);
  const { reports, error, reload } = useReports();
  if (reports?.length) return <Navigate to={reportPath(reports[0].id)} replace />;
  return (
    <div className="page">
      <PageHead title="Pendidikan Persiapan" sub="Laporan data Tahap Persiapan Bersama (TPB) dan pendidikan persiapan" />
      <ErrorNote error={error} onRetry={() => reload()} />
      {!reports ? (!error && <SkeletonCard lines={6} h={360} />) : (
        <section className="card">
          <EmptyState icon="layers" title="Belum ada laporan"
            action={canManageReports(session) && (
              <Link className="btn btn-primary btn-sm" to="/pendidikan-persiapan/kelola?tambah=1"><Icon name="plus" size={15} />Tambah laporan</Link>
            )}>
            {canManageReports(session)
              ? "Tambahkan laporan Power BI pertama dengan menempelkan link atau kode embed-nya."
              : "Laporan akan muncul di sini setelah ditambahkan oleh Admin atau Kasubdit."}
          </EmptyState>
        </section>
      )}
    </div>
  );
}
