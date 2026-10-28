import { Schema, Types, model } from "mongoose";

const companySchema = new Schema(
  {
    companyName: { type: String, unique: true, required: true },
    description: { type: String, required: true },
    industry: { type: String, required: true, minLength: 20, maxLength: 35 },
    address: { type: String },
    numberOfEmployees: { type: Number, minLength: 11, maxLength: 20 },
    companyEmail: { type: String, required: true, unique: true },
    companyHR: { type: Types.ObjectId, ref: "User" },
    jobs: [{ type: Types.ObjectId, ref: "Job" }],
    resumes: [{ type: Types.ObjectId, ref: "Application", resumeLink: String }],
  },
  { timestamps: true },
);

export const Company = model("Company", companySchema);
