import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { logTimelineEvent } from '../services/timeline.service';
import { dispatchWebhooks } from '../services/webhook.service';
import { verifyLeadOrgAccess } from '../middlewares/org.guard';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });


// Mock document upload
// POST /lead/:id/upload-document
router.post('/lead/:id/upload-document', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { docType } = req.body as { docType: 'aadhaar' | 'rc' | 'bank' };
  
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;

  // Authorization: Must belong to same org (Admin) or be the Driver themselves
  const { allowed, lead } = await verifyLeadOrgAccess(req, id);
  if (!allowed || !lead) {
    return res.status(403).json({ error: 'Unauthorized to upload documents for this profile or lead not found' });
  }

  const updateData: any = {};
  if (docType === 'aadhaar') {
    updateData.aadhaarUrl = url;
    updateData.aadhaarStatus = 'SUBMITTED';
  } else if (docType === 'rc') {
    updateData.rcUrl = url;
    updateData.rcStatus = 'SUBMITTED';
  } else if (docType === 'bank') {
    updateData.bankUrl = url;
    updateData.bankStatus = 'SUBMITTED';
  } else {
    return res.status(400).json({ error: 'Invalid docType' });
  }

  // Update DB
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  // Timeline + Webhook
  const docName = docType.toUpperCase();
  await logTimelineEvent(id, 'DOC_UPLOAD', `${docName} document uploaded.`, user.name);
  dispatchWebhooks('LEAD_UPDATED', { lead_id: id, missing_docs_update: true }).catch(console.error);

  res.json({ success: true, lead: updatedLead });
});

// Admin ONLY: Verify document
// POST /lead/:id/verify-document
router.post('/lead/:id/verify-document', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { docType } = req.body as { docType: 'aadhaar' | 'rc' | 'bank' };

  const { allowed, lead } = await verifyLeadOrgAccess(req, id);
  if (!allowed || !lead) return res.status(404).json({ error: 'Lead not found' });

  const updateData: any = {};
  if (docType === 'aadhaar') updateData.aadhaarStatus = 'VERIFIED';
  else if (docType === 'rc') updateData.rcStatus = 'VERIFIED';
  else if (docType === 'bank') updateData.bankStatus = 'VERIFIED';
  else return res.status(400).json({ error: 'Invalid docType' });

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  const docName = docType.toUpperCase();
  await logTimelineEvent(id, 'DOC_VERIFIED', `${docName} document verified.`, user.name);
  dispatchWebhooks('LEAD_UPDATED', { lead_id: id }).catch(console.error);

  res.json({ success: true, lead: updatedLead });
});

// Admin ONLY: Reject document
// POST /lead/:id/reject-document
router.post('/lead/:id/reject-document', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { docType, reason } = req.body as { docType: 'aadhaar' | 'rc' | 'bank', reason: string };

  const { allowed, lead } = await verifyLeadOrgAccess(req, id);
  if (!allowed || !lead) return res.status(404).json({ error: 'Lead not found' });

  const updateData: any = {};
  if (docType === 'aadhaar') {
    updateData.aadhaarStatus = 'REJECTED';
    updateData.aadhaarRejectReason = reason;
  } else if (docType === 'rc') {
    updateData.rcStatus = 'REJECTED';
    updateData.rcRejectReason = reason;
  } else if (docType === 'bank') {
    updateData.bankStatus = 'REJECTED';
    updateData.bankRejectReason = reason;
  } else return res.status(400).json({ error: 'Invalid docType' });

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  const docName = docType.toUpperCase();
  await logTimelineEvent(id, 'DOC_REJECTED', `${docName} document rejected. Reason: ${reason}`, user.name);
  dispatchWebhooks('LEAD_UPDATED', { lead_id: id }).catch(console.error);

  res.json({ success: true, lead: updatedLead });
});

export default router;
