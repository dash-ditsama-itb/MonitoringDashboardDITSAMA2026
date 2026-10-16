import { redirect } from "react-router";

// Bookmark lama (index.html / dashboard.html) diarahkan ke route baru.
export function clientLoader() {
  throw redirect("/dashboard");
}

export default function LegacyRedirect() {
  return null;
}
