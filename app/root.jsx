import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

export function Layout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <p style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>Memuat…</p>;
}

export function ErrorBoundary({ error }) {
  let title = "Terjadi kesalahan";
  let detail = "Silakan muat ulang halaman.";
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) title = "Halaman tidak ditemukan";
    detail = typeof error.data === "string" ? error.data : detail;
  }
  // rincian teknis untuk developer saja
  if (typeof window !== "undefined") console.error(error);
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <title>{title}</title>
      <h1>{title}</h1>
      <p>{detail}</p>
      <a href={import.meta.env.BASE_URL}>← Kembali ke beranda</a>
    </main>
  );
}
