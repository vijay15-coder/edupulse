import mongoose, { Schema, Document } from 'mongoose';

export interface ISuperAdmin extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'superadmin' | 'developer';
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const superAdminSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['superadmin', 'developer'], 
    default: 'superadmin' 
  },
  avatar: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  lastLogin: { type: Date },
  permissions: [
    { 
      type: String, 
      enum: [
        'manage_colleges',
        'view_analytics',
        'manage_subscriptions',
        'manage_users',
        'manage_payments',
        'view_reports',
        'manage_superadmins',
        'system_settings'
      ]
    }
  ],
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISuperAdmin>('SuperAdmin', superAdminSchema);
