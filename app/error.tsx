"use client";

import { useEffect } from "react";

/**
 * Shown when the workspace throws while rendering.
 *
 * The memos themselves are already on the device, so the useful thing to offer
 * is a retry and a reload — not an apology. The digest is printed because it is
 * the only handle a user has when reporting the fault.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace failed to render", error);
  }, [error]);

  return (
    <main className="fault">
      <section>
        <p className="eyebrow">Something broke</p>
        <h1>The workspace could not be drawn.</h1>
        <p>
          Your memos are still saved in this browser. Try again, and if the screen keeps failing, reload the
          page — the workspace is read back from storage on every load.
        </p>
        <div className="fault-actions">
          <button className="fault-primary" onClick={reset}>
            Try again
          </button>
          <button onClick={() => window.location.reload()}>Reload the page</button>
        </div>
        {error.digest && <code>Reference {error.digest}</code>}
      </section>
    </main>
  );
}
