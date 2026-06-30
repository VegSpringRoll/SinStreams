import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node"

// This middleware ensures the user is authenticated
const requireAuth = ClerkExpressRequireAuth()

export default requireAuth