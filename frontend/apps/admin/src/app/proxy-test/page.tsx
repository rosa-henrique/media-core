import Link from "next/link";

export default function ProxyTestPage() {
  return (
    <main>
      <h1>Proxy test</h1>
      <p>Deep route loaded successfully.</p>

      <Link href="/">Back to Admin</Link>
      <a href="/web">Go to Web</a>
    </main>
  );
}
