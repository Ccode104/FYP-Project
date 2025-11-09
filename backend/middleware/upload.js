import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for videos
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "lms_videos",
    resource_type: "video",
    public_id: `${uuidv4()}_${Date.now()}`,
  }),
});

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Multer middleware
export const uploadVideo = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    console.log("Received file:", file.originalname, file.mimetype);
    const allowed = ["video/mp4", "video/mkv", "video/webm", "video/avi"];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.match(/\.(mp4|mkv|avi|webm)$/)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed!"), false);
    }
  },
});

export { cloudinary };
