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

This repository preserves an earlier educational implementation. The features above describe the implemented code paths, not a guarantee that every workflow is production-ready. Known issues include email activation enforcement, sensitive field filtering, token expiration and revocation, input validation, resume data consistency, and file-upload handling. These need further work before a public deployment.

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

4. Replace the placeholder values. Gmail sending requires a suitable email app password; file uploads require a Cloudinary account. Use test accounts and data.
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

The trailing space in the example BEARER_KEY is intentional because the original middleware splits on that exact prefix.

## Main routes

| Area | Routes |
| --- | --- |
| Users | `/user/signup`, `/user/activate/:token`, `/user/signin`, `/user/update`, `/user/account`, `/user/logout` |
| Passwords | `/user/changepassword`, `/user/forgetPassword`, `/user/resetPassword` |
| Companies | `/company/addcompany`, `/company/update`, `/company/delete`, `/company/companydata/:companyId`, `/company/search`, `/company/applications` |
| Jobs | `/jobs/addjob`, `/jobs/update`, `/jobs/delete`, `/jobs/alljobs`, `/jobs/jobs`, `/jobs/jobsfilter`, `/jobs/uploadresume` |

Resume uploads use multipart form data with a file field named `resume`.

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
