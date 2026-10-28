import { Schema, Types, model } from "mongoose";

const applicationSchema = new Schema(
  {
    jobId: { type: Types.ObjectId, ref: "Job", required: true }, // job id
    userId: { type: Types.ObjectId, ref: "User", required: true }, // applier id
    userTechSkills: [{ type: String }], // [node , typescript]
    userSoftSkills: [{ type: String }], // [communication,team worker]
    userResumeURL: { secure_url: String}, // pdf >>> cloudinary
  },
  { timestamps: true }
);

export const Application = model("Application", applicationSchema);
