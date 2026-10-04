import { Profile } from "@/components/profile"

export const metadata = { title: "Profile, Pact" }

export default async function ProfilePage({ params }: PageProps<"/squad/[id]">) {
  const { id } = await params
  return <Profile id={id} />
}
