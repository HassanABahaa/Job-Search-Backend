import { Router } from "express";
import * as companyController from "./company.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validation } from "../../middleware/validation.middleware.js";
import { isAuthenticated } from "../../middleware/auth.middleware.js";
import {
  addCompanySchema,
  companyDataSchema,
  searchShema,
  updateSchema,
} from "./company.schema.js";

const router = Router();

// Add company
router.post(
  "/addcompany",
  isAuthenticated,
  validation(addCompanySchema),
  asyncHandler(companyController.addCompany)
);

// update company
router.patch(
  "/update",
  isAuthenticated,
  validation(updateSchema),
  asyncHandler(companyController.updateCompany)
);

// delete company
router.delete(
  "/delete",
  isAuthenticated,
  asyncHandler(companyController.deleteCompany)
);

// Get company date
router.get(
  "/companydata/:companyId",
  isAuthenticated,
  validation(companyDataSchema),
  asyncHandler(companyController.companyData)
);

// Search for a company
router.get(
  "/search",
  isAuthenticated,
  validation(searchShema),
  asyncHandler(companyController.search)
);

// Application for specific job
router.get(
  "/applications",
  isAuthenticated,
  asyncHandler(companyController.applications)
);
export default router;
