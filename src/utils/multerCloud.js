import multer, { diskStorage } from "multer";
import { nanoid } from "nanoid";

export const fileValidation = {
  files: ["application/pdf"],
};

export function uploadFileCloud({ filter }) {
  const storage = diskStorage({
    filename: (req, file, cb) => {
      cb(null, nanoid() + "__" + file.originalname);
    },
  });
  const fileFilter = (req, file, cb) => {
    if (!filter.includes(file.mimetype)) {
      return cb(new Error("Invalid format!", false));
    }
    return cb(null, true);
  };

  const multerUpload = multer({ storage, fileFilter });

  return multerUpload;
}
