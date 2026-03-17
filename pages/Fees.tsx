
import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, Calendar, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Download, Loader2, ArrowLeft } from 'lucide-react';
import { User, FeeRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface FeesProps {
  user: User;
  setActiveTab?: (tab: string) => void;
}

const Fees: React.FC<FeesProps> = ({ user, setActiveTab }) => {
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFees();
  }, [user.id]);

  const loadFees = async () => {
    if (!isSupabaseConfigured) {
      setFees([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', user.id);
      
      if (error) throw error;

      if (data && data.length > 0) {
        setFees(data as FeeRecord[]);
      } else {
        setFees([]);
      }
    } catch (err) {
      console.warn('Failed to load fees:', err);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedFee) return;
    setIsProcessing(true);
    
    try {
      // 1. Update DB Status
      const { error } = await supabase
        .from('fees')
        .update({ status: 'PAID', payment_date: new Date().toISOString() })
        .eq('id', selectedFee.id);
      
      if (error) throw error;

      // Update local state
      setFees(fees.map(f => f.id === selectedFee.id ? { ...f, status: 'PAID' as const, paymentDate: new Date().toISOString() } : f));
      setPaymentSuccess(true);
    } catch (err) {
      console.error("Payment persistence failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Payment Confirmed!</h2>
        <p className="text-slate-500 mb-10 text-lg">Transaction finalized in the university database.</p>
        <button onClick={() => setPaymentSuccess(false)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold">
          Close Portal
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <h2 className="text-3xl font-bold text-slate-900">Financial Portal</h2>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-3xl font-bold text-slate-900">Financial Portal</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {fees && fees.length > 0 ? (
            fees.map((fee) => (
              <div key={fee.id} className="p-6 rounded-[2rem] border bg-white border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${fee.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Wallet className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Tuition Installment</h4>
                    <p className="text-xs text-slate-400">Due: {fee.due_date}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <p className="text-2xl font-black text-slate-900">₹${fee.amount}</p>
                  {fee.status !== 'PAID' && (
                    <button onClick={() => setSelectedFee(fee)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Pay Now</button>
                  )}
                  {fee.status === 'PAID' && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Paid</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h4 className="font-bold text-slate-800 mb-2">No Fee Records Found</h4>
              <p className="text-slate-500 text-sm">You currently have no tuition fees or all fees have been paid.</p>
              <p className="text-slate-400 text-xs mt-4">Contact the admin if you believe this is an error.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Fee Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-600">Total Outstanding</span>
                <span className="font-bold text-slate-900">
                  ₹${fees.filter(f => f.status !== 'PAID').reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-600">Total Paid</span>
                <span className="font-bold text-emerald-600">
                  ₹${fees.filter(f => f.status === 'PAID').reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="text-sm font-bold text-slate-700">Total Amount</span>
                <span className="font-black text-slate-900 text-lg">
                  ₹${fees.reduce((sum, f) => sum + f.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Payment Info
            </h4>
            <p className="text-xs text-blue-800">All payments are securely processed and recorded in the system. Keep your transaction IDs for reference.</p>
          </div>
        </div>
      </div>

      {selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 animate-in zoom-in duration-300 text-center">
            <h3 className="text-2xl font-extrabold mb-4">Checkout</h3>
            <p className="text-slate-500 mb-8">Confirm payment of <b>₹${selectedFee.amount}</b></p>
            <div className="flex gap-4">
              <button onClick={() => setSelectedFee(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">Cancel</button>
              <button onClick={handlePayment} disabled={isProcessing} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold">
                {isProcessing ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
