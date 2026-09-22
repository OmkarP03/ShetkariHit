import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '@/i18n';

/** Bottom navigation — four items, matching the reference screens.
 *  §70 warns against overcrowding; secondary destinations (Market, Crop
 *  Doctor, Analytics) are reached from within Today and Account, not here. */
const TABS = [
  { to: '/today',   key: 'nav.home',    icon: HomeIcon },
  { to: '/ask',     key: 'nav.ask',     icon: MicIcon },
  { to: '/schemes', key: 'nav.schemes', icon: SchemeIcon },
  { to: '/account', key: 'nav.account', icon: UserIcon },
];

export default function AppShell() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map(({ to, key, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    // 56px tall: a thumb target, not a mouse target
                    'flex h-tap flex-col items-center justify-center gap-1 text-xs',
                    isActive ? 'text-leaf' : 'text-ink-faint',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon active={isActive} />
                    <span className="font-medium">{t(key)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/* Inline icons: no icon-font download, no flash of missing glyphs on a slow
   connection, and they inherit currentColor so the active state is free. */

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3"
        stroke="currentColor" strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SchemeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5 12 4l9 5.5M5 10v9h14v-9" stroke="currentColor" strokeWidth="1.8"
        strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
      <path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0} />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
