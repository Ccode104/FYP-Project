import multer from 'multer';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Memory storage for Google Drive and YouTube uploads
export const uploadVideoMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit
  fileFilter: (req, file, cb) => {
    console.log('Received file:', file.originalname, file.mimetype);
    const allowed = [
      'video/mp4',
      'video/mkv',
      'video/webm',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ];
    const allowedExtensions = /\.(mp4|mkv|webm|avi|mov|wmv|flv)$/i;
    if (allowed.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
});

// Stub for S3 upload (not implemented)
export const uploadBufferToS3 = async () => null;
