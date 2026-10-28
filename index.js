import express from "express";
import { connectDB } from "./DB/connection.js";
import userRouter from "./src/modules/user/user.router.js";
import jobsRouter from "./src/modules/jobs/jobs.router.js";
import companyRouter from "./src/modules/company/company.router.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT;

// parsing
app.use(express.json());

// connect to DB
await connectDB();

// APIs for user
app.use("/user", userRouter);

// APIs for company
app.use("/company", companyRouter);

// APIs for job
app.use("/jobs", jobsRouter);

// Not found page handler
app.use("*", (req, res, next) => {
  return res.status(404).json({ success: false, msg: "Page not found" });
});

// Global error handler
app.use((error, req, res, next) => {
  const statusCode = error.cause || 500;
  return res
    .status(statusCode)
    .json({ success: false, msg: error.message, stack: error.stack });
});

app.listen(port, () => console.log(`App listening on port ${port}!`));
