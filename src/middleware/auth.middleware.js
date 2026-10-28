import jwt from "jsonwebtoken";
import { User } from "../../DB/models/user.model.js";
import { Token } from "../../DB/models/token.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  let { token } = req.headers;

  // check token
  if (!token) return next(new Error("Missing token!", { cause: 400 }));

  // Bearer key >> Check prefix
  if (!token.startsWith(process.env.BEARER_KEY))
    return next(
      new Error("Invalid token or bearer key is missing!", { cause: 401 })
    );

  token = token.split(process.env.BEARER_KEY)[1];

  // check token validation
  const tokenDB = await Token.findOne({ token, isValid: true });
  if (!tokenDB)
    return next(new Error("Token not found or not valid", { cause: 400 }));

  // verify token
  const payload = jwt.verify(token, process.env.SECRET_KEY);

  // check user
  const user = await User.findById(payload.id);
  if (!user) return next(new Error("User not found", { cause: 404 }));

  // pass user
  req.user = user;

  // call next controller
  return next();
});
