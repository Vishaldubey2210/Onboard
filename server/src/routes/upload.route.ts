import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import prisma from '../utils/prisma';
import { CSVRow } from '../../../shared/types';
import { Prisma, UserRole } from '@prisma/client';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) return cleaned.slice(2);
  if (cleaned.startsWith('0') && cleaned.length === 11) return cleaned.slice(1);
  return cleaned;
}

function normalizeVehicleType(v: string): string | null {
  const map: Record<string, string> = {
    'two wheeler': 'TWO_WHEELER',
    '2 wheeler': 'TWO_WHEELER',
    'bike': 'TWO_WHEELER',
    'scooter': 'TWO_WHEELER',
    'three wheeler': 'THREE_WHEELER',
    '3 wheeler': 'THREE_WHEELER',
    'auto': 'THREE_WHEELER',
    'auto rickshaw': 'THREE_WHEELER',
    'four wheeler': 'FOUR_WHEELER',
    '4 wheeler': 'FOUR_WHEELER',
    'car': 'FOUR_WHEELER',
    'cab': 'FOUR_WHEELER',
    'heavy': 'HEAVY_VEHICLE',
    'truck': 'HEAVY_VEHICLE',
    'bus': 'HEAVY_VEHICLE',
  };
  const normalized = map[v?.toLowerCase().trim()] ?? null;
  if (!normalized) {
    const upper = v?.toUpperCase().replace(/\s+/g, '_');
    if (['TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER', 'HEAVY_VEHICLE'].includes(upper)) {
      return upper;
    }
  }
  return normalized;
}

function normalizeChannel(c: string): string {
  const map: Record<string, string> = {
    'whatsapp': 'WHATSAPP',
    'wa': 'WHATSAPP',
    'email': 'EMAIL',
    'mail': 'EMAIL',
    'call': 'CALL',
    'phone': 'CALL',
    'api': 'API',
  };
  return map[c?.toLowerCase().trim()] ?? 'WHATSAPP';
}

function normalizeStatus(s: string): string {
  const map: Record<string, string> = {
    'submitted': 'SUBMITTED',
    'verified': 'VERIFIED',
    'rejected': 'REJECTED',
    'not_submitted': 'NOT_SUBMITTED',
    'pending': 'NOT_SUBMITTED'
  };
  return map[s?.toLowerCase().trim()] ?? 'NOT_SUBMITTED';
}

function parseBoolean(v: string | undefined): boolean {
  if (!v) return false;
  return v.trim().toLowerCase() === 'true' || v.trim().toLowerCase() === 'yes' || v.trim() === '1';
}

router.post('/upload-csv', authenticateToken, requireRole(['ADMIN']), upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const errors: string[] = [];
  const created: string[] = [];
  const skipped: string[] = [];

  try {
    const rows = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // Validate required fields
      if (!row.name?.trim()) {
        errors.push(`Row ${rowNum}: missing name`);
        continue;
      }
      if (!row.phone?.trim()) {
        errors.push(`Row ${rowNum}: missing phone`);
        continue;
      }

      const phone = normalizePhone(row.phone);
      if (phone.length !== 10) {
        errors.push(`Row ${rowNum}: invalid phone ${row.phone}`);
        continue;
      }

      const vehicleType = row.vehicle_type
        ? normalizeVehicleType(row.vehicle_type)
        : null;

      const vehicleCount = row.vehicle_count
        ? parseInt(row.vehicle_count, 10)
        : null;

      try {
        const lead = await prisma.lead.upsert({
          where: { phone },
          create: {
            name: row.name.trim(),
            phone,
            email: row.email?.trim() || null,
            city: row.city?.trim() || null,
            vehicleType: vehicleType as Prisma.LeadCreateInput['vehicleType'],
            vehicleCount: vehicleCount && !isNaN(vehicleCount) ? vehicleCount : null,
            preferredChannel: (normalizeChannel(row.preferred_channel ?? '')) as Prisma.LeadCreateInput['preferredChannel'],
            orgId: (req as any).user.orgId,
            aadhaarStatus: row.aadhaar_status ? normalizeStatus(row.aadhaar_status) as any : 'NOT_SUBMITTED',
            bankStatus: row.bank_status ? normalizeStatus(row.bank_status) as any : 'NOT_SUBMITTED',
            rcStatus: row.rc_status ? normalizeStatus(row.rc_status) as any : 'NOT_SUBMITTED',
            appInstalled: parseBoolean(row.app_installed),
          },
          update: {
            name: row.name.trim(),
            email: row.email?.trim() || undefined,
            city: row.city?.trim() || undefined,
            vehicleType: vehicleType as Prisma.LeadUpdateInput['vehicleType'] ?? undefined,
            vehicleCount: vehicleCount && !isNaN(vehicleCount) ? vehicleCount : undefined,
            aadhaarStatus: row.aadhaar_status ? normalizeStatus(row.aadhaar_status) as any : undefined,
            bankStatus: row.bank_status ? normalizeStatus(row.bank_status) as any : undefined,
            rcStatus: row.rc_status ? normalizeStatus(row.rc_status) as any : undefined,
            appInstalled: parseBoolean(row.app_installed) || undefined,
          },
        });

        // Log CSV upload event
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            source: 'CSV',
            rawInput: JSON.stringify(row),
            parsedOutput: {
              phone,
              vehicleType,
              vehicleCount,
              normalized: true,
            } as Prisma.InputJsonValue,
          },
        });

        created.push(phone);
      } catch (dbErr) {
        skipped.push(`Row ${rowNum}: DB error - ${(dbErr as Error).message}`);
      }
    }

    return res.json({
      success: true,
      total: rows.length,
      created: created.length,
      skipped: skipped.length,
      errors,
      skipped_details: skipped,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse CSV', detail: (err as Error).message });
  }
});

export default router;
