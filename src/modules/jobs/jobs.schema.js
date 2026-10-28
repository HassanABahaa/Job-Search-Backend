import joi from "joi";
import { objectIdValidation } from "../../middleware/validation.middleware.js";

export const addJobSchema = joi.object({
  jobTitle: joi.string().required().min(20).max(50),
  jobLocation: joi.string().valid("onsite", "remotely", "hybrid").required(),
  workingTime: joi.string().valid("part-time", "full-time").required(),
  seniorityLevel: joi
    .string()
    .valid("Junior", "Mid-Level", "Senior", "Team-Lead", "CTO")
    .required(),
  jobDescription: joi.string().max(150).required(),
  technicalSkills: joi.array().items(joi.string()).required(),
  softSkills: joi.array().items(joi.string()).required(),
  addedBy: joi.custom(objectIdValidation),
});

export const updateSchema = joi.object({
  jobTitle: joi.string().min(20).max(50),
  jobLocation: joi.string().valid("onsite", "remotely", "hybrid"),
  workingTime: joi.string().valid("part-time", "full-time"),
  seniorityLevel: joi
    .string()
    .valid("Junior", "Mid-Level", "Senior", "Team-Lead", "CTO"),
  jobDescription: joi.string().max(150),
  technicalSkills: joi.array().items(joi.string()),
  softSkills: joi.array().items(joi.string()),
  addedBy: joi.string().custom(objectIdValidation),
});
