import joi from "joi";
import { objectIdValidation } from "../../middleware/validation.middleware.js";

export const addCompanySchema = joi.object({
  companyName: joi.string().required(),
  description: joi.string().required(),
  industry: joi.string().min(20).max(35).required(),
  address: joi.string(),
  numberOfEmployees: joi.number().min(11).max(20),
  companyEmail: joi.string().email().required(),
  companyHR: joi.string().custom(objectIdValidation),
});

export const updateSchema = joi.object({
  companyName: joi.string(),
  description: joi.string(),
  industry: joi.string().min(20).max(35),
  address: joi.string(),
  numberOfEmployees: joi.number().min(11).max(20),
  companyEmail: joi.string().email(),
});

export const companyDataSchema = joi.object({
  companyId: joi.custom(objectIdValidation).required(),
});

export const searchShema = joi.object({
  name: joi.string().required(),
});
