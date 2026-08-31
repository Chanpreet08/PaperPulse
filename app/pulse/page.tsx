import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import {
  conversationToSource,
  toPulseConversation,
} from "@/components/pulse/conversation-utils"
import { PulseWorkspace } from "@/components/pulse/pulse-workspace"
import type {
  PulseConversation,
  PulseSource,
} from "@/components/pulse/types"
import { Toaster } from "@/components/ui/sonner"
import { listConversationsForUser } from "@/features/conversations"
import { getUser, UserError } from "@/features/users"

export default async function PulsePage() {
  const { isAuthenticated } = await auth()

  if (!isAuthenticated) {
    redirect("/")
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    redirect("/")
  }

  const email =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  let initialConversations: PulseConversation[] = []
  let initialSources: PulseSource[] = []

  if (email) {
    try {
      const user = await getUser({ email })
      const conversations = await listConversationsForUser(user.id)
      initialConversations = conversations.map(toPulseConversation)
      initialSources = initialConversations.map(conversationToSource)
    } catch (error) {
      if (!(error instanceof UserError && error.code === "not_found")) {
        throw error
      }
    }
  }

  return (
    <>
      <PulseWorkspace
        initialConversations={initialConversations}
        initialSources={initialSources}
      />
      <Toaster richColors position="bottom-right" />
    </>
  )
}
