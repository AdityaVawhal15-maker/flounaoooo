import Image from "next/image";

// Shared frame for login / signup / verify — mobile-first column that
// becomes a centered card on desktop.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 items-start justify-center bg-cream px-5 py-8 lg:items-center">
      <div className="w-full max-w-md lg:rounded-3xl lg:border lg:border-line lg:bg-cream lg:p-10 lg:shadow-card">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Radiues"
            width={56}
            height={56}
            priority
            className="h-14 w-14"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
