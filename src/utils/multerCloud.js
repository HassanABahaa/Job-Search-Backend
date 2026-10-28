import multer, { diskStorage } from "multer";
import { nanoid } from "nanoid";

export const fileValidation = {
  files: ["application/pdf"],
};

export function uploadFileCloud({ filter }) {
  const storage = diskStorage({
    filename: (req, file, cb) => {
      cb(null, nanoid() + ".pdf");
    },
  });
  const fileFilter = (req, file, cb) => {
    if (!filter.includes(file.mimetype)) {
      return cb(new Error("Invalid format!", { cause: 400 }));
    }
    return cb(null, true);
  };

  const multerUpload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

  return multerUpload;
}
