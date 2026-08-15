import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      forceRedirectUrl="/pulse"
      fallbackRedirectUrl="/pulse"
      signInUrl="/sign-in"
    />
  );
}
