import { RequireAccess } from "../../components/Access.jsx";
import { SugtPanel } from "../../components/Sugt.jsx";

export default function SugtDashboard() {
  return <RequireAccess area="activities" page="Dashboard SUGT"><div className="page"><SugtPanel /></div></RequireAccess>;
}
