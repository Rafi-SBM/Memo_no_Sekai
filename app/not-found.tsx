import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="fault">
      <section>
        <p className="eyebrow">Nothing here</p>
        <h1>That page does not exist.</h1>
        <p>The workspace lives at the root of the app. Everything you have written is still there.</p>
        <div className="fault-actions">
          <Link className="fault-primary" href="/">
            Back to your memos
          </Link>
        </div>
      </section>
    </main>
  );
}
