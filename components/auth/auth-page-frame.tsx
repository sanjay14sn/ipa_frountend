import Image from "next/image";

export interface AuthPageFrameProps {
  children: React.ReactNode;
}

/**
 * Shared chrome for the login pages: full-page centered column on the app
 * background with the IPA lockup above the card slot. Applied to /login and
 * /admin-login via app/(auth)/layout.tsx; /ci/login renders it directly
 * (it must stay inside the CI layout tree for CIAuthProvider).
 */
export function AuthPageFrame({ children }: AuthPageFrameProps) {
  return (
    <div
      data-testid="auth-page-frame"
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6"
    >
      <Image
        src="/brand/ipa-lockup.png"
        alt="Ideal Play Abacus"
        width={433}
        height={66}
        priority
      />
      {children}
    </div>
  );
}
