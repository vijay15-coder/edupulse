import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  collegeId: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  monthlyPrice: number;
  totalAmountPaid: number;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'upi';
  autoRenew: boolean;
  features: string[];
  maxStudents: number;
  maxFaculty: number;
  maxCourses: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema: Schema = new Schema({
  collegeId: { type: String, required: true, unique: true, index: true },
  plan: { 
    type: String, 
    enum: ['starter', 'professional', 'enterprise'], 
    default: 'starter' 
  },
  status: { 
    type: String, 
    enum: ['active', 'expired', 'cancelled', 'suspended'], 
    default: 'active',
    index: true
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  nextBillingDate: { type: Date, required: true },
  monthlyPrice: { type: Number, required: true },
  totalAmountPaid: { type: Number, default: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['credit_card', 'bank_transfer', 'upi'],
    default: 'credit_card'
  },
  autoRenew: { type: Boolean, default: true },
  features: [String],
  maxStudents: { type: Number, required: true },
  maxFaculty: { type: Number, required: true },
  maxCourses: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

subscriptionSchema.index({ status: 1, endDate: 1 });

export default mongoose.model<ISubscription>('Subscription', subscriptionSchema);
