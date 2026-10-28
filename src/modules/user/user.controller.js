import moment from "moment";
import { User } from "../../../DB/models/user.model.js";
import { sendEmails } from "../../utils/sendEmail.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { Token } from "../../../DB/models/token.model.js";
import randomstring from "randomstring";

export const signup = async (req, res, next) => {
  // check if user found
  const userExisted = await User.findOne({ email: req.body.email });
  if (userExisted)
    return next(new Error("User already existed!", { cause: 409 }));

  // check password
  if (req.body.password !== req.body.confirmPassword)
    return next(
      new Error("Password must match confirm password", { cause: 400 })
    );

  // Hashing password
  const hashPassword = bcryptjs.hashSync(
    req.body.password,
    parseInt(process.env.SALT_ROUND)
  );

  if (req.body.recoveryEmail == req.body.email)
    return next(new Error("Recovery email mustn't match email!"));

  // create user
  const user = await User.create({
    ...req.body,
    password: hashPassword,
    username: `${req.body.firstName.toLowerCase()}_${req.body.lastName.toLowerCase()}`,
  });

  // change date format
  user.DOB = moment(req.body.DOB).format("YYYY-MM-DD");
  await user.save();

  // generate token
  const token = jwt.sign({ email: req.body.email }, process.env.SECRET_KEY);

  // send message to email
  const messageSent = sendEmails({
    to: user.email,
    subject: "Activate account",
    html: `<a href="http://localhost:${process.env.PORT}/user/activate/${token}">Click here to activate account</a>`,
  });

  if (!messageSent) return next(new Error("Email is invalid", { cause: 400 }));

  return res
    .status(200)
    .json({ success: true, msg: "User created successfully!", user });
};

export const activate = async (req, res, next) => {
  const { token } = req.params;

  const payload = jwt.verify(token, process.env.SECRET_KEY);

  const activateUser = await User.findOneAndUpdate(
    { email: payload.email },
    {
      isActivated: true,
    }
  );

  return res.send("Account activated successfully, You can login now!");
};

export const signin = async (req, res, next) => {
  // Check if user exists
  const user = await User.findOne({
    $or: [{ email: req.body.email }, { mobileNumber: req.body.mobileNumber }],
  });

  if (!user) {
    return next(new Error("User not found!", { cause: 404 }));
  }

  // Check password
  const matchPassword = bcryptjs.compareSync(req.body.password, user.password);

  if (!matchPassword) {
    return next(new Error("Invalid password!", { cause: 401 }));
  }

  // Generate token
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.SECRET_KEY
  );

  // save token in DB
  await Token.create({ token, userId: user._id });

  // Update user status to "online"
  user.status = "online";
  await user.save();

  // Send response
  return res.status(200).json({
    success: true,
    token,
  });
};

export const update = async (req, res, next) => {
  // get user
  const user = await User.findById(req.user._id);
  if (!user) return next(new Error("User not found!", { cause: 404 }));

  // if (!req.body.length)
  //   return next(new Error("Enter date to update in user account"));

  // check owner
  if (req.user._id.toString() !== user._id.toString()) {
    return next(
      new Error("You are not the owner to update this account", { cause: 401 })
    );
  }

  // Check email , mobileNumber
  if (req.body.email || req.body.mobileNumber) {
    const email = await User.findOne({ email: req.body.email });
    if (email)
      return next(
        new Error("Email already exists, try with another email!", {
          cause: 400,
        })
      );
    const mobileNumber = await User.findOne({
      mobileNumber: req.body.mobileNumber,
    });
    if (mobileNumber)
      return next(
        new Error(
          "Mobile number already exists, try with another mobile number!",
          {
            cause: 400,
          }
        )
      );
  }

  // update data
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      email: req.body.email,
      recoveryEmail: req.body.recoveryEmail,
      DOB: req.body.DOB,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: `${req.body.firstName.toLowerCase()}_${req.body.lastName.toLowerCase()}`,
    },
    {
      new: true,
    }
  );
  // change date format
  updatedUser.DOB = moment(req.body.DOB).format("YYYY-MM-DD");
  // change date activated if user changed email
  if (req.body.email) updatedUser.isActivated = false;

  await updatedUser.save();

  // generate token
  const token = jwt.sign({ email: req.body.email }, process.env.SECRET_KEY);

  // send message to email
  const messageSent = sendEmails({
    to: updatedUser.email,
    subject: "Activate account",
    html: `<a href="http://localhost:${process.env.PORT}/user/activate/${token}">Click here to activate account</a>`,
  });

  if (!messageSent) return next(new Error("Email is invalid", { cause: 400 }));

  return res.json({
    success: true,
    msg: "User updated successfully",
    updatedUser,
  });
};

export const deleteAccount = async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) return next(new Error("User not found", { cause: 404 }));

  if (req.user._id.toString() !== user._id.toString())
    return next(
      new Error("The owner only can delete account!", { cause: 401 })
    );

  await user.deleteOne();
  return res.json({ success: true, msg: "User deleted successfully" });
};

export const userAccount = async (req, res, next) => {
  const user_account = await User.findById(req.user._id);
  if (!user_account) return next(new Error("User not found!", { cause: 404 }));

  // check owner
  if (req.user._id.toString() !== user._id.toString()) {
    return next(
      new Error("You are not the owner to get this account data", {
        cause: 401,
      })
    );
  }

  return res.json({ success: true, user: user_account });
};

export const anotherUser = async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id }).select({
    password: 0,
    recoveryEmail: 0,
    _id: 0,
    isActivated: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0,
  });

  if (!user) return next(new Error("User not found", { cause: 404 }));

  return res.status(200).json({ success: true, user });
};

export const changePassword = async (req, res, next) => {
  // check old password = user password in db
  const compare = bcryptjs.compareSync(req.body.oldPassword, req.user.password);
  if (!compare)
    return next(new Error("Old password must match user password!"));

  // check new password = user password in db
  const compareNew = bcryptjs.compareSync(
    req.body.newPassword,
    req.user.password
  );
  if (compareNew)
    return next(new Error("New password mustn't match password(in DB)"));

  // hashing password
  const hashPassword = bcryptjs.hashSync(req.body.newPassword);

  // update password
  await User.findOneAndUpdate(
    { _id: req.user._id },
    { password: hashPassword },
    { new: true }
  );
  // send response
  return res.json({ success: true, msg: "password updated successfully" });
};

export const forgetPassword = async (req, res, next) => {
  // Check if user exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new Error("User not found!", { cause: 404 }));
  }

  // Generate a random one-time password (OTP)
  const otp = randomstring.generate({
    length: 6,
    charset: "numeric",
  });

  // Store the OTP in the user document
  user.resetPasswordOTP = otp;
  user.resetPasswordExpires = moment().add(1, "hour"); // by search
  await user.save();

  // send email with code
  const messageSent = await sendEmails({
    to: user.email,
    subject: "Reset password",
    html: `<div>${otp}</div>`,
  });
  if (!messageSent) return next(new Error("Email invalid!"));

  return res.status(200).json({
    success: true,
    msg: "One-time password sent successfully to email. Use this OTP to reset your password.",
  });
};

export const resetPassword = async (req, res, next) => {
  // Check if user exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new Error("User not found!", { cause: 404 }));
  }

  // Check if the provided OTP matches the stored OTP and if it's not expired
  if (
    user.resetPasswordOTP !== req.body.otp ||
    moment() > moment(user.resetPasswordExpires)
  ) {
    return next(
      new Error("Invalid or expired one-time password!", { cause: 400 })
    );
  }

  // check new password = user password in db
  // const compareNew = bcryptjs.compareSync(
  //   req.body.newPassword,
  //   req.user.password
  // );
  // if (compareNew)
  //   return next(new Error("New password mustn't match old password"));

  if (req.body.newPassword !== req.body.confirmPassword)
    return next(new Error("new password must match confirm password"));

  // Hash the new password
  const hashPassword = bcryptjs.hashSync(
    req.body.newPassword,
    parseInt(process.env.SALT_ROUND)
  );

  // Update the user's password
  user.password = hashPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // Send response
  return res.status(200).json({
    success: true,
    msg: "Password reset successfully.",
  });
};

export const recoveryEmail = async (req, res, next) => {
  const user = await User.find({ recoveryEmail: req.body.recoveryEmail });

  if (!user.length)
    return next(
      new Error("There are no users with this email", { cause: 404 })
    );

  return res.json({ user });
};

export const logout = async (req, res, next) => {
  let { token } = req.headers;

  token = token.split(process.env.BEARER_KEY)[1];
  await Token.findOneAndUpdate({ token }, { isValid: false });

  return res.status(200).json({ success: true, msg: "User logged out" });
};
