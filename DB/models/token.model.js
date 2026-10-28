import { Types } from "mongoose";
import { Schema, model } from "mongoose";

const tokenSchema = new Schema(
  {
    token: { type: String, required: true },
    userId: { type: Types.ObjectId, ref: "User" },
    isValid: { type: Boolean, default: true },
    agent: { type: String },
    expiredAt: { type: Date, expires: 0 },
  },
  { timestamps: true }
);

export const Token = model("Token", tokenSchema);
