"use client";

/**
 * Last resort: a failure in the root layout itself, where neither the app's
 * stylesheet nor `app/error.tsx` is available. Everything here is inline on
 * purpose, and it must render its own <html> and <body>.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f6f7f4",
          color: "#1e2520",
          font: "16px/1.6 system-ui, -apple-system, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <h1 style={{ font: "700 26px/1.2 system-ui, sans-serif", margin: "0 0 12px" }}>
            Memo no Sekai could not start.
          </h1>
          <p style={{ margin: "0 0 20px", color: "#5d665f" }}>
            Nothing has been lost: memos are stored in this browser and are read back on every load. Reloading
            usually clears this.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              font: "inherit",
              padding: "10px 18px",
              borderRadius: "10px",
              border: 0,
              cursor: "pointer",
              background: "#df6b43",
              color: "#fff",
            }}
          >
            Reload the page
          </button>
          {error.digest && (
            <p style={{ marginTop: "20px", font: "13px ui-monospace, monospace", color: "#7c857e" }}>
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
