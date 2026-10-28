import { Router } from "express";
import * as userController from "./user.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validation } from "../../middleware/validation.middleware.js";
import {
  activateAccountSchema,
  forgetPasswordSchema,
  passwordSchema,
  recoverySchema,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
  updateSchema,
} from "./user.schema.js";
import { isAuthenticated } from "../../middleware/auth.middleware.js";
const router = Router();

// signup
router.post(
  "/signup",
  validation(signupSchema),
  asyncHandler(userController.signup)
);

// activate
router.get(
  "/activate/:token",
  validation(activateAccountSchema),
  asyncHandler(userController.activate)
);

// signin
router.post(
  "/signin",
  validation(signinSchema),
  asyncHandler(userController.signin)
);

// update account
router.patch(
  "/update",
  isAuthenticated,
  validation(updateSchema),
  asyncHandler(userController.update)
);

// delete accout
router.delete(
  "/delete",
  isAuthenticated,
  asyncHandler(userController.deleteAccount)
);

// get user account
router.get(
  "/account",
  isAuthenticated,
  asyncHandler(userController.userAccount)
);

// get another user account
router.get(
  "/account/:id",
  // isAuthenticated,
  asyncHandler(userController.anotherUser)
);

// // change password
router.patch(
  "/changepassword",
  validation(passwordSchema),
  isAuthenticated,
  asyncHandler(userController.changePassword)
);

// forget password
router.patch(
  "/forgetPassword",
  validation(forgetPasswordSchema),
  asyncHandler(userController.forgetPassword)
);
router.patch(
  "/resetPassword",
  validation(resetPasswordSchema),
  asyncHandler(userController.resetPassword)
);

router.get(
  "/recoveryEmail",
  validation(recoverySchema),
  asyncHandler(userController.recoveryEmail)
);

router.post("/logout", isAuthenticated, userController.logout);

export default router;
