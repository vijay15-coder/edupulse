
import React, { useState, useEffect } from 'react';
import { Megaphone, Send, X, Info, AlertTriangle, CheckCircle, Clock, Trash2, Loader2, ArrowLeft, ChevronDown, Plus, Image as ImageIcon, FileText, Link as LinkIcon } from 'lucide-react';
import { Notification, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AnnouncementsProps {
  onSend: (notification: Notification) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  history: Notification[];
  setActiveTab?: (tab: string) => void;
  currentUserRole: UserRole;
}

const contentTypeOptions = ['General', 'Academics', 'Opportunities', 'Events', 'Alumni', 'Seminars', 'Workshops', 'News'];
type AttachmentKind = 'NONE' | 'MEDIA' | 'FILE' | 'URL';

const Announcements: React.FC<AnnouncementsProps> = ({ onSend, onDelete, history, setActiveTab, currentUserRole }) => {
  const [showModal, setShowModal] = useState(false);
  const [contentType, setContentType] = useState('General');
  const [tags, setTags] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'INFO' | 'WARNING' | 'SUCCESS'>('INFO');
  const [targetAudience, setTargetAudience] = useState<'EVERYONE' | 'STUDENTS' | 'FACULTY' | 'HOD' | 'ADMIN'>('EVERYONE');
  const [attachmentType, setAttachmentType] = useState<AttachmentKind>('NONE');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showBroadcastingOptions, setShowBroadcastingOptions] = useState(false);

  const canCreateAnnouncement = currentUserRole !== UserRole.STUDENT;

  const buildComposedMessage = (resolvedAttachment?: string) => {
    const cleanedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .join(', ');
    const attachmentValue = resolvedAttachment || '';
    const metaParts = [
      `Content Type: ${contentType}`,
      cleanedTags ? `Tags: ${cleanedTags}` : '',
      `Audience: ${targetAudience}`,
      attachmentType !== 'NONE'
        ? `Attachment: ${attachmentType}${attachmentValue ? ` (${attachmentValue})` : ''}`
        : ''
    ].filter(Boolean);

    const body = message.trim();
    return `${metaParts.join(' | ')}\n\n${body}`;
  };

  const resetForm = () => {
    setContentType('General');
    setTags('');
    setTitle('');
    setMessage('');
    setType('INFO');
    setTargetAudience('EVERYONE');
    setAttachmentType('NONE');
    setAttachmentUrl('');
    setAttachmentFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateAnnouncement || !message.trim() || isSubmitting) return;
    if (attachmentType === 'URL' && !attachmentUrl.trim()) return;
    if ((attachmentType === 'MEDIA' || attachmentType === 'FILE') && !attachmentFile) return;

    setIsSubmitting(true);
    try {
      let resolvedAttachment = '';
      if (attachmentType === 'URL') {
        resolvedAttachment = attachmentUrl.trim();
      } else if ((attachmentType === 'MEDIA' || attachmentType === 'FILE') && attachmentFile) {
        resolvedAttachment = attachmentFile.name;
        if (isSupabaseConfigured) {
          const safeName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
          const filePath = `announcements/${Date.now()}-${safeName}`;
          const tryBuckets = ['announcement-files', 'schedule-files'];
          for (const bucket of tryBuckets) {
            const { error } = await supabase.storage.from(bucket).upload(filePath, attachmentFile, {
              cacheControl: '3600',
              upsert: false,
              contentType: attachmentFile.type || undefined
            });
            if (!error) {
              const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
              resolvedAttachment = data.publicUrl || attachmentFile.name;
              break;
            }
          }
        }
      }

      const finalTitle = title.trim() || `${contentType} Update`;
      const newNotification: Notification = {
        id: `ann-${Date.now()}`,
        college_id: '',
        user_id: null,
        title: finalTitle,
        message: buildComposedMessage(resolvedAttachment),
        type,
        created_at: new Date().toISOString(),
        is_read: false
      };

      await onSend(newNotification);
      resetForm();
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeletingId) return;
    setIsDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showBroadcastingOptions && !target.closest('.broadcasting-options')) {
        setShowBroadcastingOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBroadcastingOptions]);
  const parseAnnouncementMessage = (rawMessage: string) => {
    const raw = String(rawMessage || '').trim();
    const [metaBlock = '', bodyBlock = ''] = raw.split('\n\n');
    const meta = metaBlock
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf(':');
        if (separatorIndex === -1) return null;
        return {
          label: part.slice(0, separatorIndex).trim(),
          value: part.slice(separatorIndex + 1).trim()
        };
      })
      .filter((item): item is { label: string; value: string } => Boolean(item));

    const body = bodyBlock.trim() || raw;
    return { meta, body };
  };

  return (
    <div className="space-y-6 px-3 sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveTab && setActiveTab('dashboard')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Institutional Broadcasting</h1>
          <p className="text-slate-500 text-sm">Send priority messages to all students and faculty members.</p>
        </div>
      </div>

      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div></div>
          <div className="relative broadcasting-options w-full sm:w-auto">
            <button 
              onClick={() => setShowBroadcastingOptions(!showBroadcastingOptions)}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-8 py-4 rounded-[1.5rem] font-bold transition-all shadow-xl shadow-indigo-100 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> New Announcement
              <ChevronDown className={`w-4 h-4 transition-transform ${showBroadcastingOptions ? 'rotate-180' : ''}`} />
            </button>

            {/* Broadcasting Options Dropdown */}
            {showBroadcastingOptions && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-16 w-full sm:w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50">
                <button
                  onClick={() => {
                    setShowModal(true);
                    resetForm();
                    setShowBroadcastingOptions(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-t-lg hover:bg-slate-50 transition flex items-center gap-3 border-b border-slate-100"
                >
                  <Megaphone className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">Regular Announcement</p>
                    <p className="text-xs text-slate-500">Create a standard announcement</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowModal(true);
                    resetForm();
                    setShowBroadcastingOptions(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-b-lg hover:bg-emerald-50 transition flex items-center gap-3"
                >
                  <Megaphone className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">Institutional Broadcasting</p>
                    <p className="text-xs text-slate-500">Broadcast to entire institution</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{history.length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Blasts</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">100%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Delivery Rate</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">Active</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Network Status</p>
          </div>
        </div>
      </div>
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-50">
          <h3 className="text-xl font-bold text-slate-800">Blast History</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {history.length === 0 ? (
            <div className="p-10 sm:p-20 text-center text-slate-400">
              <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No announcements have been sent yet.</p>
            </div>
          ) : (
            history.map((ann) => {
              const parsed = parseAnnouncementMessage(ann.message);
              return (
                <div
                  key={ann.id}
                  className="p-4 sm:p-6 md:p-7 bg-gradient-to-br from-white to-slate-50/70 hover:from-indigo-50/40 hover:to-white transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 sm:gap-4 min-w-0 w-full">
                      <div
                        className={`p-3 rounded-xl shrink-0 border ${
                          ann.type === 'INFO'
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            : ann.type === 'WARNING'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}
                      >
                        {ann.type === 'INFO' ? (
                          <Info className="w-5 h-5" />
                        ) : ann.type === 'WARNING' ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="text-base sm:text-lg font-extrabold text-slate-900 break-words">{ann.title}</h4>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              ann.type === 'INFO'
                                ? 'bg-indigo-100 text-indigo-700'
                                : ann.type === 'WARNING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {ann.type}
                          </span>
                        </div>

                        {parsed.meta.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {parsed.meta.map((item, index) => (
                              <span
                                key={`${ann.id}-meta-${index}`}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px]"
                              >
                                <span className="font-semibold text-slate-500">{item.label}:</span>
                                <span className="font-semibold text-slate-700">{item.value}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-slate-700 text-sm leading-relaxed break-words whitespace-pre-wrap">{parsed.body}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                          <span>|</span>
                          <span>Broadcasted to all members</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(ann.id)}
                      disabled={isDeletingId === ann.id}
                      className="self-start p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors md:opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Delete announcement"
                    >
                      {isDeletingId === ann.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h3 className="text-2xl font-black text-slate-900">New Broadcast</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {!canCreateAnnouncement && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  Students cannot create announcements.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-indigo-100 outline-none"
                >
                  {contentTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Add tags (comma separated)"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-indigo-100 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Title (Optional)</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Internship Opportunity" 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-indigo-100 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <div className="flex gap-2">
                  {['INFO', 'WARNING', 'SUCCESS'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t as any)}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${
                        type === t 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                        : 'border-transparent bg-slate-50 text-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write something here" 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-indigo-100 outline-none h-32 resize-none"
                  required
                />
                <p className="text-right text-xs text-slate-400">{message.length}/500</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Attachment Selection</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onClick={() => { setAttachmentType('MEDIA'); setAttachmentUrl(''); }} className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 ${attachmentType === 'MEDIA' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}><ImageIcon className="w-4 h-4" />Media</button>
                  <button type="button" onClick={() => { setAttachmentType('FILE'); setAttachmentUrl(''); }} className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 ${attachmentType === 'FILE' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}><FileText className="w-4 h-4" />File</button>
                  <button type="button" onClick={() => { setAttachmentType('URL'); setAttachmentFile(null); }} className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 ${attachmentType === 'URL' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}><LinkIcon className="w-4 h-4" />URL</button>
                  <button type="button" onClick={() => { setAttachmentType('NONE'); setAttachmentUrl(''); setAttachmentFile(null); }} className={`px-3 py-2 rounded-xl border text-sm font-semibold ${attachmentType === 'NONE' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>None</button>
                </div>
                {(attachmentType === 'MEDIA' || attachmentType === 'FILE') && (
                  <input
                    type="file"
                    accept={attachmentType === 'MEDIA' ? 'image/*,video/*' : '*'}
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700"
                  />
                )}
                {attachmentType === 'URL' && (
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Audience Selection</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as 'EVERYONE' | 'STUDENTS' | 'FACULTY' | 'HOD' | 'ADMIN')}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-indigo-100 outline-none"
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="STUDENTS">Students</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="HOD">HOD</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !canCreateAnnouncement}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Broadcast Now</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;


