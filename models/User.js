import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email:   { type: String, required: true },
    name:    { type: String },
    image:   { type: String },
  },
  { timestamps: true }
)

export default mongoose.model("User", userSchema)