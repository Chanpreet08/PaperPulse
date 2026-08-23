import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"

export default async function Home() {
  const { isAuthenticated } = await auth()

  if (isAuthenticated) {
    redirect("/pulse")
  }

  return (
    <section className="relative flex flex-1 items-center justify-center px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <SignIn
        routing="hash"
        forceRedirectUrl="/pulse"
        fallbackRedirectUrl="/pulse"
        signUpUrl="/sign-up"
      />
    </section>
  )
}
