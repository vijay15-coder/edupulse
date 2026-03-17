import mongoose, { Schema, Document } from 'mongoose';

export interface ICollege extends Document {
  collegeId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  principalName: string;
  adminEmail: string;
  studentCount: number;
  facultyCount: number;
  establishedYear: number;
  logo?: string;
  website?: string;
  isActive: boolean;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'inactive';
  subscriptionPlan: 'starter' | 'professional' | 'enterprise';
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  monthlyFee: number;
  totalRevenueGenerated: number;
  lastPaymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const collegeSchema: Schema = new Schema({
  collegeId: { type: String, unique: true, required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  principalName: { type: String, required: true },
  adminEmail: { type: String, required: true, lowercase: true },
  studentCount: { type: Number, default: 0 },
  facultyCount: { type: Number, default: 0 },
  establishedYear: { type: Number, required: true },
  logo: { type: String },
  website: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  subscriptionStatus: { 
    type: String, 
    enum: ['trial', 'active', 'suspended', 'inactive'], 
    default: 'trial',
    index: true
  },
  subscriptionPlan: { 
    type: String, 
    enum: ['starter', 'professional', 'enterprise'], 
    default: 'starter' 
  },
  subscriptionStartDate: { type: Date, default: Date.now },
  subscriptionEndDate: { type: Date, required: true },
  monthlyFee: { type: Number, default: 0 },
  totalRevenueGenerated: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'SuperAdmin', required: true }
});

collegeSchema.index({ createdAt: -1 });
collegeSchema.index({ subscriptionStatus: 1, isActive: 1 });

export default mongoose.model<ICollege>('College', collegeSchema);
