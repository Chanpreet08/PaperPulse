import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import {
  getIndexJobForUser,
  IndexJobError,
} from "@/features/index-jobs"
import { getUser, UserError } from "@/features/users"

function errorResponse(error: unknown): NextResponse {
  if (error instanceof UserError) {
    switch (error.code) {
      case "invalid_input":
        return NextResponse.json({ error: error.message }, { status: 400 })
      case "not_found":
        return NextResponse.json({ error: error.message }, { status: 404 })
      case "conflict":
        return NextResponse.json({ error: error.message }, { status: 409 })
      case "db_error":
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (error instanceof IndexJobError) {
    switch (error.code) {
      case "invalid_input":
        return NextResponse.json({ error: error.message }, { status: 400 })
      case "not_found":
        return NextResponse.json({ error: error.message }, { status: 404 })
      case "db_error":
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const message =
    error instanceof Error ? error.message : "Internal server error."
  return NextResponse.json({ error: message }, { status: 500 })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  if (!email) {
    return NextResponse.json(
      { error: "Authenticated user has no email address." },
      { status: 400 }
    )
  }

  try {
    const { id } = await context.params
    const user = await getUser({ email })
    const job = await getIndexJobForUser(id, user.id)
    return NextResponse.json(job)
  } catch (error) {
    return errorResponse(error)
  }
}
