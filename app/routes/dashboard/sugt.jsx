import { RequireAccess } from "../../components/Access.jsx";
import { Icon } from "../../components/Icon.jsx";
import { InfoTip } from "../../components/InfoTip.jsx";
import {
  DetailLink, participantRatings, perjadinRatings, RatingList, SugtMeters, sugtStatus, sugtTone, sugtUnits,
} from "../../components/Sugt.jsx";
import { Bar, EmptyState, ErrorNote, PageHead, SkeletonCard, Spinner } from "../../components/ui.jsx";
import { SUGT_URL } from "../../config.js";
import { fmtDateTime, fmtNum, fmtRelative } from "../../lib/format.js";
import { useApi } from "../../stores/data.js";

export default function SugtDashboard() {
  return <RequireAccess area="activities" page="Dashboard SUGT"><SugtPage /></RequireAccess>;
}

function SugtPage() {
  const { data, error, loading, reload } = useApi("/dashboard/sugt");
  const s = data?.data;
  const home = s?.progress.detailUrl || SUGT_URL;

  return (
    <div className="page">
      <PageHead title="Program SUGT"
        sub={s ? <span title={fmtDateTime(s.generatedAt)}>Data diperbarui {fmtRelative(s.generatedAt)}</span> : "Ringkasan kegiatan dan umpan balik SUGT"}>
        {loading && s && <span className="tb-loading"><Spinner size={14} />Memperbarui…</span>}
        <button type="button" className="btn btn-sm" onClick={() => reload()} disabled={loading}><Icon name="refresh" size={15} />Muat ulang</button>
        <a className="btn btn-sm" href={home} target="_blank" rel="noopener noreferrer">Buka aplikasi SUGT<Icon name="external" size={14} /></a>
      </PageHead>
      <ErrorNote error={error} onRetry={() => reload()} />
      {!s ? (
        error ? (
          <section className="card">
            <EmptyState icon="alert" title="Ringkasan SUGT belum bisa ditampilkan">
              Data lengkap tetap bisa dilihat langsung di aplikasi SUGT.
            </EmptyState>
          </section>
        ) : <><SkeletonCard lines={3} /><div className="grid g-2"><SkeletonCard /><SkeletonCard /></div></>
      ) : (
        <>
          <SugtProgress s={s} />
          <SugtMeters s={s} links />
          <div className="grid g-2">
            <FeedbackCard title="Umpan Balik Peserta" info="sugtParticipantFeedback" f={s.participantFeedback}
              noun="formulir" items={participantRatings(s.participantFeedback)} />
            <FeedbackCard title="Evaluasi Perjalanan Dinas" info="sugtPerjadinFeedback" f={s.perjadinFeedback}
              noun="evaluasi" items={perjadinRatings(s.perjadinFeedback)} />
          </div>
        </>
      )}
    </div>
  );
}

function SugtProgress({ s }) {
  const u = sugtUnits(s);
  const [label, tone] = sugtStatus(s);
  const schools = Math.round(u.total / 10);
  const { offline, online } = s.sessions;
  const sessions = { delivered: offline.delivered + online.delivered, total: offline.total + online.total };
  return (
    <section className="card progress-card sugt-progress">
      <div className="pc-progress">
        <span className="kpi-lab"><Icon name="trend" size={15} />Kegiatan Terlaksana<InfoTip k="sugtProgress" /></span>
        <div className="pc-valrow"><b className="pc-val">{fmtNum(u.completed)}/{fmtNum(u.total)}</b><span className="pc-unit">kegiatan ({u.percent}%)</span>
          <span className={"pill pc-status " + tone}>{label}</span></div>
        <Bar value={u.percent} tone={sugtTone(u.percent)} />
        <span className="pc-note">Per sekolah: 8 sesi, 1 pretest, 1 posttest</span>
      </div>
      <dl className="sugt-facts">
        <div><dt>Sekolah</dt><dd>{fmtNum(schools)}</dd></div>
        <div><dt>Sesi terlaksana</dt><dd>{fmtNum(sessions.delivered)}<span className="muted">/{fmtNum(sessions.total)}</span></dd></div>
        <div><dt>Respons peserta</dt><dd>{fmtNum(s.participantFeedback.responseCount)}</dd></div>
        <div><dt>Evaluasi perjadin</dt><dd>{fmtNum(s.perjadinFeedback.responseCount)}</dd></div>
      </dl>
    </section>
  );
}

function FeedbackCard({ title, info, f, noun, items }) {
  return (
    <section className="card">
      <div className="card-head">
        <div><h2 className="card-title with-info">{title}<InfoTip k={info} /></h2>
          <div className="card-sub">{f.responseCount ? `Rata-rata dari ${fmtNum(f.responseCount)} ${noun} · skala 1–10` : `Belum ada ${noun} yang masuk`}</div></div>
        <DetailLink href={f.detailUrl} />
      </div>
      <RatingList items={items} />
    </section>
  );
}
