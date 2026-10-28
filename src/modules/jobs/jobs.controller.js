import { Application } from "../../../DB/models/application.model.js";
import { Company } from "../../../DB/models/company.model.js";
import { Job } from "../../../DB/models/job.model.js";
import { User } from "../../../DB/models/user.model.js";
import cloudinary from "../../utils/cloud.js";

export const addJob = async (req, res, next) => {
  // Check if the user is Company_HR
  if (req.user.role !== "Company_HR") {
    return next(new Error("Only Company HRs can add jobs"));
  }

  // Add job

  const company = await Company.findOne({ companyHR: req.user._id });
  const job = await Job.create({
    ...req.body,
    addedBy: req.user._id,
    company: company._id,
  });

  company.jobs.push([job._id]);
  await company.save();

  // send response
  return res.status(200).json({
    success: true,
    message: "Job added successfully",
    job,
  });
};

export const updateJob = async (req, res, next) => {
  // Check if the user is Company_HR
  if (req.user.role !== "Company_HR") {
    return next(new Error("Only Company HRs can add jobs"));
  }

  //   if (!req.body.length) return next(new Error("Enter date to update in job"));

  const { jobTitle } = req.query;
  //   const {jobId} = req.query
  if (!jobTitle) return next(new Error("Job title is required!"));

  // get job
  const job = await Job.findOne({ jobTitle, addedBy: req.user._id });
  if (!job) return next(new Error("Job not found", { cause: 404 }));

  // check job owner
  if (req.user._id.toString() !== job.addedBy.toString()) {
    return next(
      new Error("You are not the owner to update job", {
        cause: 401,
      })
    );
  }

  // update data
  const updateJob = await Job.findByIdAndUpdate(
    job._id,
    {
      ...req.body,
    },
    { new: true }
  );

  return res.status(200).json({
    success: true,
    msg: "Job updated successfully",
    updateJob,
  });
};

export const deleteJob = async (req, res, next) => {
  // Check role
  if (req.user.role !== "Company_HR") {
    throw new Error("Only Company HRs can delete jobs");
  }

  // Extract jobId from query parameters
  const { jobId } = req.query;
  if (!jobId) {
    throw new Error("Job Id is required");
  }

  // Find the job
  const job = await Job.findOne({ _id: jobId, addedBy: req.user._id });
  if (!job) {
    throw new Error("Job not found!", { status: 404 });
  }

  // Check owner
  if (req.user._id.toString() !== job.addedBy.toString()) {
    throw new Error("You are not the owner of this job", { status: 401 });
  }

  // Delete the job
  await Job.deleteOne({ _id: jobId });

  return res.json({ success: true, msg: "Job deleted successfully!" });
};

export const getAllJobs = async (req, res, next) => {
  // Check role
  if (req.user.role !== "User" && req.user.role !== "Company_HR") {
    throw new Error("Unauthorized", { status: 403 });
  }

  // Get all jobs
  const jobs = await Job.find().populate("company");
  if (!jobs.length === 0) return next(new Error("No jobs to found!"));
  // send response
  return res.json({ success: true, jobs });
};

export const JobsSpecificCompany = async (req, res, next) => {
  // Check role
  if (req.user.role !== "User" && req.user.role !== "Company_HR") {
    throw new Error("Unauthorized access", { status: 403 });
  }

  if (!req.query.companyName) return next(new Error("Query is empty!"));

  // Find the company by name
  const company = await Company.findOne({ companyName: req.query.companyName });

  // Check if the company exists
  if (!company) {
    return next(new Error("Company not found", { status: 404 }));
  }

  // Get jobs
  const jobs = await Job.find({ company: company._id });
  // if (!jobs) return next(new Error("No found any jobs!"));

  // Send response
  return res.json({ success: true, jobs });
};

export const jobsFilter = async (req, res, next) => {
  // Check role
  if (req.user.role !== "User" && req.user.role !== "Company_HR") {
    throw new Error("Unauthorized access", { status: 403 });
  }

  // const filteredJobs = await Job.find({
  //   workingTime: req.query.workingTime,
  //   jobLocation: req.query.jobLocation,
  //   seniorityLevel: req.query.seniorityLevel,
  //   jobTitle: { $regex: `${req.query.jobTitle}`, $options: "i" },
  //   technicalSkills: { $in: req.query.technicalSkills },
  // });

  const filter = {}; // By search
  if (req.query.workingTime) {
    filter.workingTime = req.query.workingTime;
  }
  if (req.query.jobLocation) {
    filter.jobLocation = req.query.jobLocation;
  }
  if (req.query.seniorityLevel) {
    filter.seniorityLevel = req.query.seniorityLevel;
  }
  if (req.query.jobTitle) {
    filter.jobTitle = { $regex: req.query.jobTitle, $options: "i" };
  }
  if (req.query.technicalSkills && Array.isArray(req.query.technicalSkills)) {
    filter.technicalSkills = { $in: req.query.technicalSkills };
  }

  const filteredJobs = await Job.find(filter);

  if (filteredJobs.length === 0) filteredJobs[0] = "No result to get";

  return res.json({ success: true, jobs: filteredJobs });
};

export const uploadResume = async (req, res, next) => {
  // check role
  if (req.user.role !== "User")
    return next(new Error("User only can upload CVs"));

  // upload pdf
  const userResumeUrl = await cloudinary.uploader.upload(req.file.path);

  // Create application
  const Resume = await Application.create({
    jobId: req.query.jobId,
    userId: req.user._id,
    userTechSkills: req.body.userTechSkills,
    userSoftSkills: req.body.userSoftSkills,
    userResumeURL: userResumeUrl.secure_url,
  });

  await Company.updateOne(
    { _id: req.body.companyId },
    { $push: { resumes: Resume._id, resumeLink: userResumeUrl.secure_url } }
  );

  // save resume in user model
  await User.findByIdAndUpdate(req.user._id, {
    resume: {
      secure_url: userResumeUrl.secure_url,
      public_id: userResumeUrl.public_id,
    },
  });

  // send response
  return res.json({
    success: true,
    msg: "Resume uploaded successfully!",
    userResumeUrl: userResumeUrl.secure_url,
    Resume,
  });
};
