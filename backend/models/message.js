import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true }, // 🔥 important for 1-1 chat
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    message: { type: String, required: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
