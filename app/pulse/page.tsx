import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { PulseWorkspace } from "@/components/pulse/pulse-workspace"
import { Toaster } from "@/components/ui/sonner"

export default async function PulsePage() {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    redirect("/")
  }

  return (
    <>
      <PulseWorkspace />
      <Toaster richColors position="bottom-right" />
    </>
  )
}
