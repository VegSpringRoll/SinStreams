import express from "express"
import { Webhook } from "svix"
import User from "../models/User.js"

const router = express.Router()

// POST /api/auth/webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

    const svixHeaders = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    }

    let data, type

    try {
      const body = req.body.toString()
      ;({ data, type } = wh.verify(body, svixHeaders))
    } catch (err) {
      console.error("Webhook verification failed:", err.message)
      return res.status(400).json({ error: "Verification failed" })
    }

    try {
      switch (type) {
        case "user.created":
          await User.create({
            clerkId: data.id,
            email: data.email_addresses?.[0]?.email_address,
            name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
            image: data.image_url,
          })
          break

        case "user.updated":
          await User.findOneAndUpdate(
            { clerkId: data.id },
            {
              email: data.email_addresses?.[0]?.email_address,
              name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
              image: data.image_url,
            }
          )
          break

        case "user.deleted":
          if (data.id) {
            await User.findOneAndDelete({ clerkId: data.id })
          }
          break

        default:
          console.log("Unhandled event type:", type)
      }
    } catch (err) {
      console.error("DB operation failed:", err.message)
      return res.status(500).json({ error: "DB error" })
    }

    res.json({ message: "Event received" })
  }
)

export default router