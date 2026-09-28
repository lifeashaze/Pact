import { Profile } from "@/components/profile"

export const metadata = { title: "Profile, Pact90" }

export default async function ProfilePage({ params }: PageProps<"/squad/[id]">) {
  const { id } = await params
  return <Profile id={id} />
}
