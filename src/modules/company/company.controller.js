import { Application } from "../../../DB/models/application.model.js";
import { Company } from "../../../DB/models/company.model.js";
import { Job } from "../../../DB/models/job.model.js";
import { User } from "../../../DB/models/user.model.js";

export const addCompany = async (req, res, next) => {
  // check role
  if (req.user.role !== "Company_HR")
    return next(new Error("HRs only can add company"));

  // check email if exist
  const existingCompany = await Company.findOne({
    companyEmail: req.body.companyEmail,
    companyName: req.body.companyName,
  });
  if (existingCompany) return next(new Error("This company already existed!"));

  // create company
  const company = await Company.create({
    ...req.body,
    companyHR: req.user._id,
  });

  // send response
  return res.json({
    success: true,
    msg: "Company created successfully",
    company,
  });
};

export const updateCompany = async (req, res, next) => {
  // check role
  if (req.user.role !== "Company_HR")
    return next(new Error("HRs only can update company"));

  // user doesn't write any thing
  // if (!req.body.length)
  //   return next(new Error("Enter date to update in company"));

  // get company
  const company = await Company.findOne({ companyHR: req.user._id });
  if (!company) return next(new Error("Company not found", { cause: 404 }));

  // check company owner
  if (req.user._id.toString() !== company.companyHR.toString()) {
    return next(
      new Error("You are not the owner to update company account", {
        cause: 401,
      })
    );
  }

  // check company email if already exists
  if (req.body.companyEmail) {
    const email = await Company.findOne({
      companyEmail: req.body.companyEmail,
    });
    if (email)
      return next(
        new Error("Email already exists, try with another email!", {
          cause: 400,
        })
      );
  }

  // update data
  const updateCompany = await Company.findByIdAndUpdate(
    company._id,
    {
      ...req.body,
    },
    { new: true }
  );

  return res.status(200).json({
    success: true,
    msg: "Company updated successfully",
    updateCompany,
  });
};

export const deleteCompany = async (req, res, next) => {
  // check role
  if (req.user.role !== "Company_HR")
    return next(new Error("HRs only can delete company"));

  const company = await Company.findOne({ companyHR: req.user._id });
  if (!company) return next(new Error("Company not found!", { cause: 404 }));

  // check owner
  if (req.user._id.toString() !== company.companyHR.toString())
    return next(new Error("You are not the owner of this company"));

  await company.deleteOne();
  return res.json({ success: true, msg: "Company deleted successfully!" });
};

export const companyData = async (req, res, next) => {
  // check role
  if (req.user.role !== "Company_HR")
    return next(new Error("HRs only can add company"));

  const company = await Company.findById(req.params.companyId).populate("jobs");
  if (!company) return next(new Error("Company not found!"));

  return res.status(200).json({ company });
};

export const search = async (req, res, next) => {
  // check role
  if (req.user.role !== "Company_HR" && req.user.role !== "User") {
    return next(new Error("Only Company HRs or Users can perform this action"));
  }

  if (req.query.name == undefined) return next(new Error("Query is empty!"));

  const company = await Company.findOne({
    companyName: { $regex: req.query.name, $options: "i" },
  });
  return res.json({ sucess: true, company });
};

export const applications = async (req, res, next) => {
  // check role
  if (req.user.role !== "Company_HR")
    return next(new Error("HRs only can add company!"));

  const company = await Company.findOne({ companyHR: req.user._id });
  if (!company) {
    return next(new Error("Not found company!"));
  }

  const jobs = await Job.find({ company: company._id });
  if (!jobs.length) {
    return next(new Error("Company doesn't have any jobs!"));
  }

  // Get all applications
  const jobIds = jobs.map((job) => job._id);

  const applications = await Application.find({
    jobId: { $in: jobIds },
  }).populate({
    path: "userId",
    select:
      "firstName lastName username email mobileNumber -_id ",
  });

  const Applications = applications.map((application) => ({
    // by search
    user: {
      ...(application.userId ? application.userId.toObject() : {}),
      resume: application.userResumeURL?.secure_url,
    },
    userTechSkills: application.userTechSkills,
    userSoftSkills: application.userSoftSkills,
  }));

  return res.status(200).json({
    success: true,
    Applications,
  });
};
