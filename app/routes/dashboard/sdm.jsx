import { RequireAccess } from "../../components/Access.jsx";
import { HumanResourcesTable } from "../../components/HumanResources.jsx";
import { PageHead } from "../../components/ui.jsx";
import { canEditHumanResources } from "../../lib/format.js";
import { useAuthStore } from "../../stores/auth.js";

export default function Sdm() {
  return <RequireAccess area="activities" page="SDM"><SdmPage /></RequireAccess>;
}

function SdmPage() {
  const session = useAuthStore((s) => s.session);
  const sub = !canEditHumanResources(session)
    ? "Daftar nama SDM semua program. Peran Anda hanya dapat melihat data."
    : "Satu daftar nama per peran, dipakai bersama semua program. Saat mengisi SDM kegiatan, cukup pilih nama dari daftar ini.";
  return (
    <div className="page">
      <PageHead title="SDM" sub={sub} />
      <HumanResourcesTable />
    </div>
  );
}
