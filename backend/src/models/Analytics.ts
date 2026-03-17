import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalytics extends Document {
  collegeId: string;
  date: Date;
  month: number;
  year: number;
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  activeUsers: number;
  totalCourses: number;
  totalAttendanceRecords: number;
  averageAttendance: number;
  totalGradesIssued: number;
  totalFeesCollected: number;
  totalFeesOutstanding: number;
  feesPaymentRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema: Schema = new Schema({
  collegeId: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now, index: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  totalStudents: { type: Number, default: 0 },
  totalFaculty: { type: Number, default: 0 },
  totalAdmins: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  totalCourses: { type: Number, default: 0 },
  totalAttendanceRecords: { type: Number, default: 0 },
  averageAttendance: { type: Number, default: 0 },
  totalGradesIssued: { type: Number, default: 0 },
  totalFeesCollected: { type: Number, default: 0 },
  totalFeesOutstanding: { type: Number, default: 0 },
  feesPaymentRate: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

analyticsSchema.index({ collegeId: 1, date: -1 });
analyticsSchema.index({ year: 1, month: 1 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);
