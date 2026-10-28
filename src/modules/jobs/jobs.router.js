import { Router } from "express";
import * as jobsController from "./jobs.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validation } from "../../middleware/validation.middleware.js";
import { isAuthenticated } from "../../middleware/auth.middleware.js";
import { addJobSchema, updateSchema } from "./jobs.schema.js";
import { fileValidation, uploadFileCloud } from "../../utils/multerCloud.js";

const router = Router();

// Add job
router.post(
  "/addjob",
  isAuthenticated,
  validation(addJobSchema),
  asyncHandler(jobsController.addJob)
);

// update job
router.patch(
  "/update",
  isAuthenticated,
  validation(updateSchema),
  asyncHandler(jobsController.updateJob)
);

// delete job
router.delete(
  "/delete",
  isAuthenticated,
  asyncHandler(jobsController.deleteJob)
);

// Jobs with their company’s information
router.get(
  "/alljobs",
  isAuthenticated,
  asyncHandler(jobsController.getAllJobs)
);

// Jobs for a specific company
router.get(
  "/jobs",
  isAuthenticated,
  asyncHandler(jobsController.JobsSpecificCompany)
);

// Jobs that match the following filters
router.get(
  "/jobsfilter",
  isAuthenticated,
  asyncHandler(jobsController.jobsFilter)
);

// Apply to job
router.post(
  "/uploadresume",
  isAuthenticated,
  uploadFileCloud({ filter: fileValidation.files }).single("resume"),
  asyncHandler(jobsController.uploadResume)
);
export default router;
