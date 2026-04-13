import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CustomizeClient from "./CustomizeClient"

export default async function CustomizePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      characterName: true,
      portraitUrl: true,
      shadowColor: true,
    },
  })

  return (
    <CustomizeClient
      name={dbUser?.name ?? session.user.name ?? ""}
      characterName={dbUser?.characterName ?? session.user.characterName ?? ""}
      portraitUrl={dbUser?.portraitUrl ?? session.user.portraitUrl ?? ""}
      shadowColor={dbUser?.shadowColor ?? session.user.shadowColor ?? "#78716c"}
    />
  )
}
