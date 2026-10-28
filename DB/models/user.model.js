import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    recoveryEmail: { type: String },
    DOB: { type: String, required: true },
    mobileNumber: { type: Number, unique: true },
    role: { type: String, enum: ["User", "Company_HR"], required: true },
    status: { type: String, enum: ["online", "offline"], default: "offline" },
    isActivated: { type: Boolean, default: false },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
    resume: { secure_url: String, public_id: String },
  },
  { timestamps: true }
);

// Concatenate firstName and lastName to create the username
// userSchema.pre("save", function (next) {
//   this.username =
//     this.firstName.toLowerCase() + "_" + this.lastName.toLowerCase();
//   next();
// });

export const User = model("User", userSchema);
