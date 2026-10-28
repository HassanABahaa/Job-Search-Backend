export const userData = (user, publicProfile = false) => {
  const fields = publicProfile
    ? ["firstName", "lastName", "username", "role"]
    : ["_id", "firstName", "lastName", "username", "email", "recoveryEmail",
       "DOB", "mobileNumber", "role", "status", "isActivated", "resume"];

  const data = {};
  for (const field of fields) {
    if (user[field] !== undefined) data[field] = user[field];
  }
  return data;
};
