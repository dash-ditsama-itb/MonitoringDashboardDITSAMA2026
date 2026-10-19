import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Icon } from "../../components/Icon.jsx";
import { reportPath, useReports } from "../../components/Reports.jsx";
import { EmptyState, ErrorNote, PageHead, SkeletonCard, Spinner } from "../../components/ui.jsx";

export default function ReportPage() {
  const params = useParams();
  const { reports, error, reload } = useReports();
  const report = reports?.find((r) => r.id === params.reportId);

  if (!reports) {
    return <div className="page"><ErrorNote error={error} onRetry={() => reload()} />{!error && <SkeletonCard lines={6} h={420} />}</div>;
  }
  if (!report) {
    return (
      <div className="page">
        <section className="card">
          <EmptyState icon="search" title="Laporan tidak ditemukan"
            action={reports.length > 0 && <Link className="btn btn-primary btn-sm" to={reportPath(reports[0].id)}><Icon name="left" size={15} />Buka laporan pertama</Link>}>
            Laporan ini mungkin sudah dihapus atau dipindahkan.
          </EmptyState>
        </section>
      </div>
    );
  }
  // key: bingkai dimuat ulang saat berpindah laporan
  return <ReportView key={report.id} report={report} />;
}

function ReportView({ report }) {
  const frame = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const fullscreen = () => {
    const el = frame.current;
    (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el);
  };
  return (
    <div className="page report-page">
      <PageHead title={report.title} sub={report.section}>
        <button type="button" className="btn btn-sm" onClick={fullscreen}><Icon name="expand" size={15} />Layar penuh</button>
      </PageHead>
      <p className="note report-hint"><Icon name="info" size={16} />Laporan Power BI paling nyaman dilihat dengan Layar penuh atau ponsel dalam posisi mendatar.</p>
      <div className="report-frame" ref={frame}>
        {!loaded && <div className="report-loading"><Spinner />Memuat laporan…</div>}
        <iframe title={report.title} src={report.url} allowFullScreen onLoad={() => setLoaded(true)} />
      </div>
    </div>
  );
}
