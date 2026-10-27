// Tab Profil, Layanan & Struktur Organisasi Ditsama di halaman masuk (panel biru; di ponsel tampil di bawah formulir).
import { OrgChart } from "./OrgChart.jsx";

const PROFIL = [
  "Direktorat Persiapan Bersama (Ditsama) merupakan unit di Institut Teknologi Bandung yang berada di bawah koordinasi Wakil Rektor Bidang Akademik dan Kemahasiswaan. Ditsama berperan dalam mempersiapkan siswa SMA menuju pendidikan tinggi sekaligus memperkuat fondasi akademik, karakter, dan keterampilan interpersonal mahasiswa ITB untuk mendukung keberhasilan studi.",
  "Pelaksanaan tugas Ditsama mencakup dua bidang utama, yaitu Pra-Universitas dan Pendidikan Persiapan. Keduanya menghubungkan pembinaan pada jenjang sekolah menengah dengan kesiapan mengikuti perkuliahan dan pengembangan diri selama menempuh pendidikan di ITB.",
  "Dengan semangat SMART—Sinergi, Membangun Karakter, Adaptif, Responsif, dan Terintegrasi, Ditsama mendukung kesinambungan persiapan pendidikan bagi siswa SMA dan mahasiswa ITB. Bagi siswa SMA, Ditsama membantu membangun kesiapan akademik, mengenali potensi, dan mempersiapkan diri menghadapi pendidikan tinggi. Bagi mahasiswa ITB, Ditsama memperkuat dasar keilmuan, mendukung adaptasi kehidupan kampus, serta membina karakter dan keterampilan yang diperlukan untuk keberhasilan studi dan pengembangan diri.",
];

const LAYANAN = [
  ["Pra-Universitas", [
    "Pada bidang Pra-Universitas, Ditsama menyelenggarakan program bagi siswa SMA, lulusan SMA, dan calon mahasiswa untuk mengenal dunia perguruan tinggi, mengembangkan minat dan potensi, serta membangun kesiapan akademik. Programnya mencakup eksplorasi sains, teknologi, seni, dan bisnis; penguatan sains dasar dan penalaran; pengenalan strategi belajar; serta pembinaan talenta, riset, dan kompetisi siswa. Ditsama juga mengembangkan program transisi menuju perkuliahan melalui bridging dan credit earning untuk membantu peserta mengenal pembelajaran tingkat universitas sejak dini.",
    "Untuk memperluas dampak program Pra-Universitas, Ditsama menjalin kemitraan dengan sekolah, instansi pemerintah, dan mitra lainnya. Kerja sama ini mencakup pendampingan sekolah, pengayaan pembelajaran siswa, serta peningkatan kompetensi guru dalam pembelajaran STEM dan pendekatan pembelajaran inovatif. Dengan demikian, dukungan kesiapan pendidikan tinggi juga diperkuat melalui lingkungan belajar di sekolah.",
  ]],
  ["Pendidikan Persiapan", [
    "Pada bidang Pendidikan Persiapan, Ditsama mengoordinasikan dan memfasilitasi pembelajaran sains dasar pada Tahap Persiapan Bersama (TPB), Mata Kuliah Wajib ITB (MKWI), serta Mata Kuliah Umum (MKU). Kegiatan ini meliputi koordinasi penyelenggaraan perkuliahan, pengembangan materi dan metode pembelajaran, serta dukungan layanan akademik bersama fakultas/sekolah, dosen, dan unit terkait.",
    "Untuk membantu mahasiswa memulai perkuliahan dengan lebih siap, Ditsama menyelenggarakan Pemetaan Kesiapan Akademik (PKA), orientasi pra-kedatangan, penguatan materi Matematika, Fisika, dan Kimia (MAFIKI), serta pendampingan belajar. Hasil pemetaan menjadi dasar untuk menyiapkan dukungan pembelajaran sesuai kebutuhan mahasiswa, termasuk tutorial dan penyediaan sumber belajar digital.",
    "Selain penguatan akademik, Ditsama melaksanakan pembinaan karakter dan keterampilan interpersonal mahasiswa TPB. Melalui program pendampingan oleh kakak tingkat (Teman Tumbuh Bersama/TTB), kampanye etika dan budaya kampus, serta panduan kehidupan mahasiswa, Ditsama mendorong tumbuhnya integritas, kemandirian, kepedulian, kemampuan berkomunikasi, dan tanggung jawab dalam kehidupan akademik maupun sosial.",
  ]],
];

const TABS = [["profil", "Profil"], ["layanan", "Layanan"], ["struktur", "Struktur Organisasi"]];

/** tab & setTab dari Shell agar salinan panel (layar lebar) dan bawah formulir (ponsel) sama. `id` membedakan kedua salinan. */
export function GateInfo({ id, tab, setTab, className = "" }) {
  return (
    <section className={"gate-info " + className} aria-label="Tentang Ditsama">
      <div className="gate-tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`${id}-${k}`} aria-selected={tab === k} aria-controls={`${id}-panel`}
            className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className={"gate-info-body" + (tab === "struktur" ? " is-org" : "")} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0}>
        {tab === "profil" && PROFIL.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}
        {tab === "layanan" && LAYANAN.map(([title, paras]) => (
          <div key={title} className="gate-info-group">
            <h2>{title}</h2>
            {paras.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}
          </div>
        ))}
        {tab === "struktur" && <OrgChart />}
      </div>
    </section>
  );
}
