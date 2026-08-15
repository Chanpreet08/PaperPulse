import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      forceRedirectUrl="/pulse"
      fallbackRedirectUrl="/pulse"
      signUpUrl="/sign-up"
    />
  );
}
