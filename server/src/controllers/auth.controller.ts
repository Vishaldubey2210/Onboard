import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { UserRole } from '@prisma/client';
import { logAudit } from '../services/audit.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-for-dev';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role, phone, orgName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Only ADMIN and DRIVER roles exist
    let assignedRole: UserRole = UserRole.DRIVER;
    if (role === 'ADMIN') assignedRole = UserRole.ADMIN;

    // Auto-create or find organization
    let orgId: string | undefined = undefined;
    if (orgName) {
      let org = await prisma.organization.findFirst({ where: { name: orgName } });
      if (!org) {
        org = await prisma.organization.create({ data: { name: orgName } });
      }
      orgId = org.id;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: assignedRole,
        orgId: orgId || null,
      },
    });

    // If DRIVER → auto-create a Lead record linked to this user
    if (assignedRole === UserRole.DRIVER) {
      const leadPhone = phone || `driver_${user.id.slice(0, 8)}`;
      // Check if lead with this phone already exists
      const existingLead = await prisma.lead.findUnique({ where: { phone: leadPhone } });
      if (!existingLead) {
        await prisma.lead.create({
          data: {
            name: user.name,
            phone: leadPhone,
            email: user.email,
            driverId: user.id,
            orgId: orgId || null,
            currentStage: 'NEW',
            slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
          },
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, orgId: user.orgId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.id, 'REGISTER', 'user', user.id, `Role: ${user.role}`);

    return res.status(201).json({ 
      success: true, 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, orgId: user.orgId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.id, 'LOGIN', 'user', user.id);

    return res.json({ 
      success: true, 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login user' });
  }
}
