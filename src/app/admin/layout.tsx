export const metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | Admin Panel',
  },
  // Admin panel must never appear in search results — it's internal-only
  // and some pages (pre-auth-check) could otherwise leak page titles.
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Intentionally minimal — the login page and the authenticated chrome
  // (top bar, bottom nav, session context) live in separate sub-layouts so
  // the login screen never renders admin-only navigation or data.
  return children;
}
