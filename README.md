# Job Search Backend

A Node.js REST API training project for job seekers and company HR users. Built during backend development training at Route Academy.

## Project scope

- User registration, email activation, sign-in, logout, and account management.
- Password change and email-based password recovery.
- Company creation, updates, deletion, and name search.
- Job creation, updates, deletion, listing, and filtering.
- PDF resume uploads through Cloudinary and job applications.
- HR access to applications submitted to their company's jobs.

## Stack

Node.js, Express.js, MongoDB, Mongoose, Joi, JWT, bcryptjs, Nodemailer, Multer, Cloudinary, and Moment.js.

## Status

This is an educational project with a focused account and resume-upload bug-fix pass. It retains the original controllers, routers, schemas, and coding structure.

The regression tests use synthetic data and mocked MongoDB, SMTP, and Cloudinary operations. They also exercise protected routes and upload size limits through a temporary local HTTP server. They do not replace end-to-end testing against a dedicated database and external test accounts.

### Fixes included

- Account responses use explicit field allowlists and never return password hashes or reset secrets.
- Account-by-ID and recovery-email routes require authentication. Recovery lookup is limited to the signed-in account.
- Sign-in requires a password and exactly one email/mobile identifier, and rejects unverified accounts.
- Session JWTs expire after one hour. Sessions are invalidated after password changes, password resets, and email changes.
- Activation links expire after one day. Users can request a new link through `/user/resendActivation`.
- Current-account lookup uses the correct variable. Partial updates preserve fields that were not sent.
- Activation emails are awaited. Failed signup email delivery removes the newly created account; failed email-change delivery leaves the existing address unchanged.
- PDF resumes are limited to 5 MB, checked for a PDF header, and removed from temporary storage after processing.
- Applications store the submitted resume URL in the schema's expected shape, use the job's company, and reject duplicate applications.
- Failed resume writes trigger cleanup of the uploaded Cloudinary file and related application references. HR listings show the resume submitted with the application.
- Client error responses no longer include stack traces.

### Remaining work before public deployment

Dependency upgrades and a new dependency audit, authentication/recovery rate limits and OTP attempt limits, database-backed integration tests, and transactional consistency for other multi-document operations still need separate work. Resume rollback is best-effort compensation, not a database transaction or a guarantee against process crashes. PDF header checks are not malware scanning.

## Run locally

1. Install Node.js and start a local MongoDB instance, or provide a dedicated test database.
2. Install dependencies:

```bash
npm ci
```

3. Copy the configuration template:

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead.

4. Set `APP_URL` to the public API origin (without a trailing slash), then replace the remaining placeholder values. Gmail sending requires a suitable email app password; file uploads require a Cloudinary account. Use test accounts and data.
5. Start the server:

```bash
npm run dev
```

The API listens on the configured PORT. No frontend or live service is included in this repository.

## Authentication header

Protected routes use the project's custom `token` header. With the example configuration:

```text
token: Bearer <JWT>
```

The trailing space in the example BEARER_KEY is intentional because the middleware splits on that exact prefix. Session tokens issued by the old version without an expiry are rejected; sign in again after updating.

## Main routes

| Area | Routes |
| --- | --- |
| Users | `/user/signup`, `/user/activate/:token`, `/user/resendActivation`, `/user/signin`, `/user/update`, `/user/account`, `/user/logout` |
| Passwords | `/user/changepassword`, `/user/forgetPassword`, `/user/resetPassword` |
| Companies | `/company/addcompany`, `/company/update`, `/company/delete`, `/company/companydata/:companyId`, `/company/search`, `/company/applications` |
| Jobs | `/jobs/addjob`, `/jobs/update`, `/jobs/delete`, `/jobs/alljobs`, `/jobs/jobs`, `/jobs/jobsfilter`, `/jobs/uploadresume` |

Resume uploads use multipart form data with a file field named `resume` (one PDF, maximum 5 MB) and a `jobId` query parameter. The company is taken from the job, not from a submitted company ID.

`POST /user/resendActivation` accepts `{ "email": "your@email.com" }`. `GET /user/recoveryEmail?recoveryEmail=your@email.com` now requires a valid token and only checks your own account.

## Regression tests

```bash
npm test
```

The test suite does not need a MongoDB instance, SMTP credentials, or Cloudinary credentials.

## Existing databases

- `isActivated` is now a Boolean and password-reset expiry is a Date. Normalize older string values in an existing database before a real deployment.
- Session expiry uses a Date field with a TTL index. Older session tokens without an `exp` claim are rejected even before TTL cleanup.
- A unique compound application index covers `(jobId, userId)`. Remove existing duplicate applications before creating this index. Do not drop production indexes blindly.
- Old applications with a missing resume snapshot cannot be reconstructed reliably from a user's latest CV. Review or backfill them from the correct original submission.

## Project structure

```text
DB/
  connection.js
  models/
src/
  middleware/
  modules/user/
  modules/company/
  modules/jobs/
  utils/
index.js
.env.example
```

The real environment file, credentials, uploaded resumes, and dependency folders are excluded from this repository.

## Author

[Hassan Ahmed Bahaa](https://github.com/HassanABahaa) | [LinkedIn](https://www.linkedin.com/in/hassan-ahmed-bahaa/)
