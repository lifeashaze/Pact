import { auth } from "@/lib/auth/server"

// Signed-out visitors go to /sign-in. This also finishes the Google OAuth
// handshake when Neon Auth sends people back to /home. Approval is checked
// in the pages themselves, see lib/viewer.ts
export default auth.middleware({ loginUrl: "/sign-in" })

export const config = {
  matcher: [
    "/home/:path*",
    "/standings/:path*",
    "/feed/:path*",
    "/squad/:path*",
    "/season/:path*",
    "/recap/:path*",
    "/setup/:path*",
    "/admin/:path*",
    "/waiting/:path*",
    "/onboarding/:path*",
  ],
}
