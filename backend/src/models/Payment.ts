import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  collegeId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  description: string;
  invoiceNumber: string;
  paymentDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema: Schema = new Schema({
  collegeId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending',
    index: true
  },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String, unique: true, index: true },
  description: { type: String, required: true },
  invoiceNumber: { type: String, unique: true, index: true },
  paymentDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

paymentSchema.index({ collegeId: 1, status: 1 });

export default mongoose.model<IPayment>('Payment', paymentSchema);
