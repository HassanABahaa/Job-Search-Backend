import joi from "joi";
import { objectIdValidation } from "../../middleware/validation.middleware.js";

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;

export const signupSchema = joi.object({
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  userName: joi.string(),
  email: joi
    .string()
    .email({
      minDomainSegments: 2,
      maxDomainSegments: 4,
      tlds: { allow: ["com", "net"] },
    })
    .pattern(new RegExp(emailRegex))
    .required(),
  password: joi.string().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")).required(),
  confirmPassword: joi.string().valid(joi.ref("password")).required(),
  recoveryEmail: joi
    .string()
    .email({
      minDomainSegments: 2,
      maxDomainSegments: 5,
      tlds: { allow: ["com", "net"] },
    })
    .pattern(new RegExp(emailRegex)),
  //   DOB: joi.date().iso().required(),
  DOB: joi.date().required(),
  mobileNumber: joi.number().required(),
  role: joi.string().valid("User", "Company_HR").required(),
  status: joi.string().valid("online", "offline").default("offline"),
});

export const activateAccountSchema = joi
  .object({
    token: joi.string().required(),
  })
  .required();

export const signinSchema = joi.object({
  email: joi.string().email(),
  mobileNumber: joi.number(),
  password: joi.string().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")).required(),
}).xor("email", "mobileNumber");

export const updateSchema = joi.object({
  email: joi.string().email(),
  mobileNumber: joi.number(),
  recoveryEmail: joi.string().email(),
  DOB: joi.date(),
  lastName: joi.string(),
  firstName: joi.string(),
}).min(1);

export const anotherUserSchema = joi.object({
  id: joi.string().custom(objectIdValidation).required(),
});

export const passwordSchema = joi
  .object({
    oldPassword: joi.string().required(),
    newPassword: joi
      .string()
      .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
      .required(),
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required(),
  })
  .required();

export const forgetPasswordSchema = joi.object({
  email: joi.string().email().required(),
});

export const resetPasswordSchema = joi.object({
  email: joi.string().email().required(),
  otp: joi.string().length(6).required(),
  newPassword: joi
    .string()
    .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
    .required(),
  confirmPassword: joi.string().valid(joi.ref("newPassword")).required(),
});

export const recoverySchema = joi.object({
  recoveryEmail: joi.string().email().required(),
});
