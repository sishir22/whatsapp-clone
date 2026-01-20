import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    message: { type: String, required: true },
    time: { type: String, required: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
