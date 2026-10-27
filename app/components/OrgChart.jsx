// Struktur Organisasi Ditsama (tab di halaman masuk). Data di ORG (config.js), urutan seperti slide resmi.
// Tampil sebagai pohon menjorok; bila tempatnya cukup lebar (container query) menjadi bagan dua kolom.
import { ORG } from "../config.js";

// kotak jabatan: jabatan + nama pejabat (nama kosong = belum tercantum di sumber)
function Post({ person, lead }) {
  return (
    <div className={"org-box" + (lead ? " lead" : "")}>
      <span className="org-role">{person.role}</span>
      {person.name && <b className="org-name">{person.name}</b>}
    </div>
  );
}

export function OrgChart() {
  return (
    <div className="org" aria-label="Struktur Organisasi Ditsama">
      <div className="org-head"><Post person={ORG.director} lead /></div>
      <div className="org-staff"><span aria-hidden="true" /><Post person={ORG.secretariat} /></div>
      <div className="org-branches">
        {ORG.subdirectorates.map((unit) => (
          <div key={unit.key} className={"org-branch unit-" + unit.key}>
            <Post person={unit} />
            <ul className="org-sections">
              {unit.sections.map((s) => <li key={s.role}><Post person={s} /></li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
