import { RequireAccess } from "../../components/Access.jsx";
import { AccountSettings } from "../../components/Accounts.jsx";
import { PageHead } from "../../components/ui.jsx";

export default function Accounts() {
  return <RequireAccess area="accounts" page="Pengaturan Akun"><AccountsPage /></RequireAccess>;
}

function AccountsPage() {
  return (
    <div className="page">
      <PageHead title="Pengaturan Akun" sub="Beri atau cabut akses pengguna, dan atur peran beserta aksesnya. Akun baru tidak bisa masuk sebelum diberi peran." />
      <AccountSettings />
    </div>
  );
}
