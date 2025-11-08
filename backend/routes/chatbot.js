import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { 
  chatAboutCourse, 
  uploadPDF, 
  chatWithPDF,
  listUserPDFs 
} from '../controllers/chatbotController.js';

const router = express.Router();

router.use(requireAuth);

// Course chatbot
router.post('/course/:offeringId', chatAboutCourse);

// PDF chatbot
router.post('/pdf/upload', upload.single('pdf'), uploadPDF);
router.post('/pdf/:pdfId/chat', chatWithPDF);
router.get('/pdfs', listUserPDFs);

export default router;
