import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mkdtemp, readFile, writeFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { User } from "../DB/models/user.model.js";
import { Token } from "../DB/models/token.model.js";
import { Job } from "../DB/models/job.model.js";
import { Company } from "../DB/models/company.model.js";
import { Application } from "../DB/models/application.model.js";
import * as userController from "../src/modules/user/user.controller.js";
import { uploadResume } from "../src/modules/jobs/jobs.controller.js";
import { signinSchema } from "../src/modules/user/user.schema.js";
import { isAuthenticated } from "../src/middleware/auth.middleware.js";
import { uploadFileCloud, fileValidation } from "../src/utils/multerCloud.js";
import cloudinary from "../src/utils/cloud.js";
import userRouter from "../src/modules/user/user.router.js";

process.env.SECRET_KEY = "test-only-secret-not-used-in-deployment";
process.env.BEARER_KEY = "Bearer ";
process.env.SALT_ROUND = "4";
process.env.APP_URL = "https://test.example.com";
const id = "507f1f77bcf86cd799439011";
const jobId = "507f1f77bcf86cd799439012";
const companyId = "507f1f77bcf86cd799439013";
const password = "testPassword123";
const fixture = () => ({
  _id: id, firstName: "Hassan", lastName: "Bahaa", username: "hassan_bahaa",
  email: "test@example.com", password: bcryptjs.hashSync(password, 4),
  DOB: "2000-01-01", role: "User", isActivated: true,
  resetPasswordOTP: "123456", resetPasswordExpires: new Date(Date.now() + 60000),
  save: async () => {},
});
const response = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  send(body) { this.body = body; return this; },
});
const call = async (controller, req) => {
  const res = response();
  let error;
  await controller(req, res, value => { error = value; });
  return { res, error };
};
const cleanups = [];
afterEach(async () => {
  mock.restoreAll();
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
const mail = (sendMail = async () => ({ accepted: ["test@example.com"] })) =>
  mock.method(nodemailer, "createTransport", () => ({ sendMail }));
const safe = user => {
  assert.equal(user.password, undefined);
  assert.equal(user.resetPasswordOTP, undefined);
  assert.equal(user.resetPasswordExpires, undefined);
};
const serverFor = async app => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.on("listening", resolve));
  cleanups.push(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
};
const tempFile = async content => {
  const folder = await mkdtemp(join(tmpdir(), "job-search-test-"));
  const path = join(folder, "resume.pdf");
  await writeFile(path, content);
  cleanups.push(() => rm(folder, { recursive: true, force: true }));
  return path;
};
const uploadMocks = () => {
  mock.method(Job, "findById", async () => ({ _id: jobId, company: companyId }));
  mock.method(Company, "findById", async () => ({ _id: companyId }));
  mock.method(Application, "findOne", async () => null);
};

test("sign-in requires a password and exactly one identifier", () => {
  for (const body of [{}, { email: "test@example.com" }, { password },
    { email: "test@example.com", mobileNumber: 123, password }])
    assert.ok(signinSchema.validate(body).error);
  assert.equal(signinSchema.validate({ email: "test@example.com", password }).error, undefined);
  assert.equal(signinSchema.validate({ mobileNumber: 123, password }).error, undefined);
});

test("activation and expiry fields use Boolean and Date schema types", () => {
  assert.equal(new User({ isActivated: "false" }).isActivated, false);
  assert.equal(new User({ isActivated: "true" }).isActivated, true);
  assert.ok(new Token({ expiredAt: new Date() }).expiredAt instanceof Date);
});

test("an unverified account cannot sign in", async () => {
  mock.method(User, "findOne", async () => ({ ...fixture(), isActivated: false }));
  const token = mock.method(Token, "create", async () => {});
  const { res, error } = await call(userController.signin, { body: { email: "test@example.com", password } });
  assert.equal(error.cause, 403);
  assert.equal(res.body, null);
  assert.equal(token.mock.callCount(), 0);
});

test("verified accounts get different one-hour sessions with stored expiry", async () => {
  mock.method(User, "findOne", async () => fixture());
  const tokens = [];
  mock.method(Token, "create", async data => tokens.push(data));
  const req = { body: { email: "test@example.com", password } };
  const first = await call(userController.signin, req);
  const second = await call(userController.signin, req);
  assert.equal(first.error, undefined);
  const payload = jwt.verify(first.res.body.token, process.env.SECRET_KEY);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.notEqual(first.res.body.token, second.res.body.token);
  assert.equal(tokens[0].expiredAt.getTime(), payload.exp * 1000);
});

test("current account works and filters private fields", async () => {
  mock.method(User, "findById", async () => fixture());
  const { res, error } = await call(userController.userAccount, { user: { _id: id } });
  assert.equal(error, undefined);
  assert.equal(res.body.user.email, "test@example.com");
  safe(res.body.user);
});

test("another account only exposes the allowed public profile fields", async () => {
  mock.method(User, "findOne", () => ({ select: async () => fixture() }));
  const { res } = await call(userController.anotherUser, { params: { id } });
  assert.deepEqual(Object.keys(res.body.user).sort(), ["firstName", "lastName", "role", "username"]);
  safe(res.body.user);
});

test("recovery lookup is limited to the authenticated account", async () => {
  let filter;
  mock.method(User, "findOne", async query => { filter = query; return fixture(); });
  const { res } = await call(userController.recoveryEmail, {
    user: { _id: id }, body: {}, query: { recoveryEmail: "recovery@example.com" },
  });
  assert.deepEqual(filter, { _id: id, recoveryEmail: "recovery@example.com" });
  safe(res.body.user);
});

test("account-by-id and recovery routes reject unauthenticated requests", async () => {
  const app = express();
  app.use(express.json());
  app.use("/user", userRouter);
  app.use((error, req, res, next) => res.status(error.cause || 500).json({ msg: error.message }));
  const url = await serverFor(app);
  for (const path of [`/user/account/${id}`, "/user/recoveryEmail?recoveryEmail=test@example.com"]) {
    const result = await fetch(url + path);
    assert.equal(result.status, 400);
    assert.match((await result.json()).msg, /Missing token/);
  }
});

test("email-only update preserves omitted fields, awaits email and revokes sessions", async () => {
  const user = fixture();
  let saved;
  let mailFinished = false;
  let html;
  mock.method(User, "findById", async () => user);
  mock.method(User, "findOne", async query => {
    assert.deepEqual(query._id, { $ne: id });
    return null;
  });
  mock.method(User, "findByIdAndUpdate", async (userId, update, options) => {
    saved = update.$set;
    assert.equal(options.runValidators, true);
    return { ...user, ...saved };
  });
  const revoke = mock.method(Token, "updateMany", async () => {});
  mail(async data => {
    html = data.html;
    await Promise.resolve();
    mailFinished = true;
    return { accepted: [data.to] };
  });
  const { res, error } = await call(userController.update, { user, body: { email: "new@example.com" } });
  assert.equal(error, undefined);
  assert.deepEqual(saved, { email: "new@example.com", isActivated: false });
  assert.equal(res.body.updatedUser.DOB, user.DOB);
  assert.equal(mailFinished, true);
  assert.match(html, /https:\/\/test.example.com\/user\/activate\//);
  assert.equal(revoke.mock.callCount(), 1);
  safe(res.body.updatedUser);
});

test("a first-name-only update keeps the last name and does not send activation mail", async () => {
  const user = fixture();
  mock.method(User, "findById", async () => user);
  mock.method(User, "findByIdAndUpdate", async (_, update) => {
    assert.deepEqual(update.$set, { firstName: "Ahmed", username: "ahmed_bahaa" });
    return { ...user, ...update.$set };
  });
  const sender = mail();
  const { error } = await call(userController.update, { user, body: { firstName: "Ahmed" } });
  assert.equal(error, undefined);
  assert.equal(sender.mock.callCount(), 0);
});

test("signup awaits email delivery and never returns the password", async () => {
  mock.method(User, "findOne", async () => null);
  mock.method(User, "create", async data => ({ ...fixture(), ...data }));
  let finished = false;
  mail(async () => { await Promise.resolve(); finished = true; return { accepted: ["test@example.com"] }; });
  const { res, error } = await call(userController.signup, {
    body: { ...fixture(), password, confirmPassword: password },
  });
  assert.equal(error, undefined);
  assert.equal(finished, true);
  safe(res.body.user);
});

test("signup handles a rejected email instead of treating its Promise as success", async () => {
  mock.method(User, "findOne", async () => null);
  mock.method(User, "create", async data => ({ ...fixture(), ...data }));
  mail(async () => ({ accepted: [] }));
  const remove = mock.method(User, "deleteOne", async () => {});
  const { res, error } = await call(userController.signup, {
    body: { ...fixture(), password, confirmPassword: password },
  });
  assert.equal(error.cause, 502);
  assert.equal(res.body, null);
  assert.equal(remove.mock.callCount(), 1);
});

test("password changes invalidate existing sessions", async () => {
  mock.method(User, "findOneAndUpdate", async () => fixture());
  const revoke = mock.method(Token, "updateMany", async () => {});
  const { error } = await call(userController.changePassword, {
    user: fixture(), body: { oldPassword: password, newPassword: "newPassword123" },
  });
  assert.equal(error, undefined);
  assert.deepEqual(revoke.mock.calls[0].arguments, [{ userId: id }, { isValid: false }]);
});

test("password reset clears OTP and invalidates sessions", async () => {
  const user = fixture();
  mock.method(User, "findOne", async () => user);
  const revoke = mock.method(Token, "updateMany", async () => {});
  const { error } = await call(userController.resetPassword, {
    body: { email: user.email, otp: "123456", newPassword: "newPassword123", confirmPassword: "newPassword123" },
  });
  assert.equal(error, undefined);
  assert.equal(user.resetPasswordOTP, undefined);
  assert.equal(user.resetPasswordExpires, undefined);
  assert.equal(revoke.mock.callCount(), 1);
});

test("missing or expired OTP is rejected", async () => {
  for (const user of [
    { ...fixture(), resetPasswordOTP: undefined },
    { ...fixture(), resetPasswordExpires: new Date(Date.now() - 60000) },
  ]) {
    mock.method(User, "findOne", async () => user);
    const { error } = await call(userController.resetPassword, { body: { otp: "123456" } });
    assert.equal(error.cause, 400);
    mock.restoreAll();
  }
});

test("authentication rejects expired JWTs and legacy sessions without expiry", async () => {
  mock.method(Token, "findOne", async () => ({ isValid: true }));
  const userLookup = mock.method(User, "findById", async () => fixture());
  for (const token of [
    jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: -1 }),
    jwt.sign({ id }, process.env.SECRET_KEY),
  ]) {
    const error = await new Promise(resolve => isAuthenticated({ headers: { token: `Bearer ${token}` } }, response(), resolve));
    assert.equal(error.cause, 401);
  }
  assert.equal(userLookup.mock.callCount(), 0);
});

test("a resume file is required", async () => {
  const { error } = await call(uploadResume, { user: fixture(), body: {}, query: { jobId } });
  assert.equal(error.cause, 400);
});

test("a fake PDF is rejected and its temporary file is deleted", async () => {
  uploadMocks();
  const upload = mock.method(cloudinary.uploader, "upload", async () => {});
  const path = await tempFile("Not a PDF");
  const { error } = await call(uploadResume, { user: fixture(), body: {}, query: { jobId }, file: { path } });
  assert.equal(error.cause, 400);
  assert.equal(upload.mock.callCount(), 0);
  await assert.rejects(access(path));
});

test("resume storage matches the schema and uses the job's company", async () => {
  uploadMocks();
  const path = await tempFile("%PDF-1.7 test fixture");
  const url = "https://example.com/submitted.pdf";
  mock.method(cloudinary.uploader, "upload", async () => ({ secure_url: url, public_id: "test-resume" }));
  mock.method(Application, "create", async data => {
    const doc = new Application(data);
    assert.equal(doc.validateSync(), undefined);
    assert.equal(doc.userResumeURL.secure_url, url);
    return doc;
  });
  mock.method(Company, "updateOne", async filter => {
    assert.equal(filter._id, companyId);
    return { matchedCount: 1 };
  });
  mock.method(User, "findByIdAndUpdate", async () => fixture());
  const { res, error } = await call(uploadResume, {
    user: fixture(), query: { jobId }, body: { companyId: "untrusted-company" }, file: { path },
  });
  assert.equal(error, undefined);
  assert.equal(res.body.Resume.userResumeURL.secure_url, url);
  await assert.rejects(access(path));
});

test("failed application save removes the Cloudinary file and temporary PDF", async () => {
  uploadMocks();
  const path = await tempFile("%PDF-1.7 test fixture");
  mock.method(cloudinary.uploader, "upload", async () => ({ secure_url: "https://example.com/test.pdf", public_id: "test-resume" }));
  mock.method(Application, "create", async () => { throw new Error("Database write failed"); });
  const destroy = mock.method(cloudinary.uploader, "destroy", async () => {});
  const { error } = await call(uploadResume, { user: fixture(), query: { jobId }, body: {}, file: { path } });
  assert.equal(error.message, "Database write failed");
  assert.equal(destroy.mock.calls[0].arguments[0], "test-resume");
  await assert.rejects(access(path));
});

test("a later database failure also rolls back the application and company reference", async () => {
  uploadMocks();
  const path = await tempFile("%PDF-1.7 test fixture");
  mock.method(cloudinary.uploader, "upload", async () => ({ secure_url: "https://example.com/test.pdf", public_id: "test-resume" }));
  mock.method(Application, "create", async () => ({ _id: jobId }));
  const companyUpdate = mock.method(Company, "updateOne", async () => ({ matchedCount: 1 }));
  mock.method(User, "findByIdAndUpdate", async () => { throw new Error("User update failed"); });
  const remove = mock.method(Application, "deleteOne", async () => {});
  const destroy = mock.method(cloudinary.uploader, "destroy", async () => {});
  const { error } = await call(uploadResume, { user: fixture(), query: { jobId }, body: {}, file: { path } });
  assert.equal(error.message, "User update failed");
  assert.deepEqual(companyUpdate.mock.calls[1].arguments[1], { $pull: { resumes: jobId } });
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(destroy.mock.callCount(), 1);
  await assert.rejects(access(path));
});

test("duplicate applications are rejected before Cloudinary upload", async () => {
  uploadMocks();
  mock.method(Application, "findOne", async () => ({ _id: jobId }));
  const path = await tempFile("%PDF-1.7 test fixture");
  const upload = mock.method(cloudinary.uploader, "upload", async () => {});
  const { error } = await call(uploadResume, { user: fixture(), query: { jobId }, body: {}, file: { path } });
  assert.equal(error.cause, 409);
  assert.equal(upload.mock.callCount(), 0);
  await assert.rejects(access(path));
});

test("the upload middleware rejects PDFs larger than 5 MB", async () => {
  const app = express();
  app.post("/upload", uploadFileCloud({ filter: fileValidation.files }).single("resume"), (req, res) => res.json({ success: true }));
  app.use((error, req, res, next) => res.status(413).json({ code: error.code }));
  const url = await serverFor(app);
  const form = new FormData();
  form.append("resume", new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: "application/pdf" }), "large.pdf");
  const result = await fetch(url + "/upload", { method: "POST", body: form });
  assert.equal(result.status, 413);
  assert.equal((await result.json()).code, "LIMIT_FILE_SIZE");
});

test("failed email delivery leaves the existing account email unchanged", async () => {
  const user = fixture();
  mock.method(User, "findById", async () => user);
  mock.method(User, "findOne", async () => null);
  const update = mock.method(User, "findByIdAndUpdate", async () => {});
  mail(async () => ({ accepted: [] }));
  const { error } = await call(userController.update, { user, body: { email: "new@example.com" } });
  assert.equal(error.cause, 502);
  assert.equal(update.mock.callCount(), 0);
});

test("signup mail errors also remove the newly created account", async () => {
  mock.method(User, "findOne", async () => null);
  mock.method(User, "create", async data => ({ ...fixture(), ...data }));
  const remove = mock.method(User, "deleteOne", async () => {});
  mail(async () => { throw new Error("SMTP unavailable"); });
  const { error } = await call(userController.signup, {
    body: { ...fixture(), password, confirmPassword: password },
  });
  assert.equal(error.message, "SMTP unavailable");
  assert.deepEqual(remove.mock.calls[0].arguments[0], { _id: id });
});

test("unverified accounts can request a fresh activation token", async () => {
  mock.method(User, "findOne", async () => ({ ...fixture(), isActivated: false }));
  let token;
  mail(async data => {
    token = data.html.match(/activate\/([^\"]+)/)[1];
    return { accepted: [data.to] };
  });
  const { error } = await call(userController.resendActivation, { body: { email: "test@example.com" } });
  assert.equal(error, undefined);
  const payload = jwt.verify(token, process.env.SECRET_KEY);
  assert.equal(payload.purpose, "activate");
  assert.equal(payload.exp - payload.iat, 86400);
});

test("session tokens cannot be used to activate an account", async () => {
  const update = mock.method(User, "findOneAndUpdate", async () => fixture());
  const token = jwt.sign({ id, email: "test@example.com" }, process.env.SECRET_KEY, { expiresIn: "1h" });
  const { error } = await call(userController.activate, { params: { token } });
  assert.equal(error.cause, 401);
  assert.equal(update.mock.callCount(), 0);
});

test("revoked sessions are rejected even if the JWT is still valid", async () => {
  mock.method(Token, "findOne", async () => null);
  const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1h" });
  const error = await new Promise(resolve => isAuthenticated({ headers: { token: `Bearer ${token}` } }, response(), resolve));
  assert.ok(error);
  assert.match(error.message, /not valid/);
});

test("valid active sessions reach the protected controller", async () => {
  const user = fixture();
  mock.method(Token, "findOne", async () => ({ isValid: true }));
  mock.method(User, "findById", async () => user);
  const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: "1h" });
  const req = { headers: { token: `Bearer ${token}` } };
  const error = await new Promise(resolve => isAuthenticated(req, response(), resolve));
  assert.equal(error, undefined);
  assert.equal(req.user, user);
});
