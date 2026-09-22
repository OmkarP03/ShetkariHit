/**
 * Shown instead of the app when Supabase config is missing or wrong.
 * This is a developer-facing screen, so it is in English only — a farmer will
 * never see it, and translating it would only make it harder to search for.
 */
export default function SetupNeeded({ reason }: { reason: string }) {
  return (
    <div className="min-h-dvh bg-canvas px-5 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-display">Setup needed</h1>
        <p className="mt-3 text-lead text-warn">{reason}</p>

        <ol className="mt-6 space-y-4 text-body text-ink-muted">
          <li>
            <span className="text-ink">1.</span> In the <code className="text-leaf">frontend</code> folder,
            copy <code className="text-leaf">.env.example</code> to <code className="text-leaf">.env.local</code>
          </li>
          <li>
            <span className="text-ink">2.</span> Get your anon key from Supabase →
            Project Settings → API → <em>Project API keys</em> → <code className="text-leaf">anon public</code>
          </li>
          <li>
            <span className="text-ink">3.</span> Paste it as the value of{' '}
            <code className="text-leaf">VITE_SUPABASE_ANON_KEY</code>
          </li>
          <li>
            <span className="text-ink">4.</span> Stop the dev server and run{' '}
            <code className="text-leaf">npm run dev</code> again — Vite only reads
            env files at startup, so a running server will not pick up the change.
          </li>
        </ol>

        <pre className="mt-6 overflow-auto rounded-card border border-hairline bg-surface p-4 text-sm">
{`VITE_SUPABASE_URL=https://naopagzyyhocsogtblab.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
        </pre>

        <p className="mt-5 text-sm text-ink-faint">
          The anon key is safe in the browser — row level security is what
          protects the data. Never put the service_role key here.
        </p>
      </div>
    </div>
  );
}
