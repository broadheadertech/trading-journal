import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <SignIn appearance={{ baseTheme: dark }} />
    </div>
  );
}
