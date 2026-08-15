import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const { isAuthenticated } = await auth()

  if (isAuthenticated) {
    redirect("/pulse")
  }

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12">
      <SignIn
        routing="hash"
        forceRedirectUrl="/pulse"
        fallbackRedirectUrl="/pulse"
        signUpUrl="/sign-up"
      />
    </section>
  )
}
