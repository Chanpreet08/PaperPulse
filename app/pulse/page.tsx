import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SourceInput } from "@/components/source-input"

export default async function PulsePage() {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    redirect("/")
  }
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Paper Pulse
          </CardTitle>
          <CardDescription>
            Add your sources to get started — upload files or paste links below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourceInput />
        </CardContent>
      </Card>
    </div>
  )
}
