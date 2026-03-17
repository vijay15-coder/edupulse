import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  superAdmin?: {
    id: string;
    email: string;
    role: 'superadmin' | 'developer';
    permissions: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export const generateToken = (superAdminId: string, email: string, role: string, permissions: string[]) => {
  return jwt.sign(
    { id: superAdminId, email, role, permissions },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as any;
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided. Access denied.' 
      });
    }

    const decoded = verifyToken(token);
    req.superAdmin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export const superAdminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.superAdmin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (req.superAdmin.role !== 'superadmin' && req.superAdmin.role !== 'developer') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only superadmin/developer can access this resource' 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

export const checkPermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.superAdmin) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized' 
        });
      }

      const hasPermission = requiredPermissions.some(perm => 
        req.superAdmin?.permissions.includes(perm)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Permission check error' 
      });
    }
  };
};
