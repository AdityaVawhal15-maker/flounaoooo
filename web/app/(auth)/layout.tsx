// Shared frame for the auth screens — deliberately thin.
//
// The redesign gives each auth screen its own header (login has a back button
// plus the wordmark, signup has a back button plus the lotus), so a layout that
// stamped one logo on all of them now fights the pages instead of helping. All
// it owns is the cream ground and the vertical rhythm; the centred column and
// max-width live in each page.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-cream">{children}</div>;
}
