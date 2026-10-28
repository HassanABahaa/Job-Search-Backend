import { Schema, Types, model } from "mongoose";

const jobSchema = new Schema(
  {
    jobTitle: { type: String, required: true, min: 20, max: 50 },
    jobLocation: {
      type: String,
      enum: ["onsite", "remotely", "hybrid"],
      required: true,
    },
    workingTime: {
      type: String,
      enum: ["part-time", "full-time"],
      required: true,
    },
    seniorityLevel: {
      type: String,
      enum: ["Junior", "Mid-Level", "Senior", "Team-Lead", "CTO"],
      required: true,
    },
    jobDescription: { type: String, max: 150, required: true },
    technicalSkills: [{ type: String, required: true }],
    softSkills: [{ type: String, required: true }],
    addedBy: { type: Types.ObjectId, ref: "User", required: true },
    company: { type: Types.ObjectId, ref: "Company" }, // Reference to the Company model
  },
  { timestamps: true }
);

export const Job = model("Job", jobSchema);
