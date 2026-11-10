import React, { useState } from 'react';
import { Camera, Phone, Send, X } from 'lucide-react';
import { TrainerProfile } from '../../types';
import { Avatar, showToast } from '../common/CommonUI';
import { PHOTO_READ_ERROR, resizeImage } from '../../lib/image';

interface CoachConnectCardProps {
  coach?: TrainerProfile;
  onSendUpdate: (subject: string, message: string, photo: Blob | null) => Promise<void>;
}

/** The main coach's profile, plus a way for the client to send the coach an update or photo. */
export const CoachConnectCard: React.FC<CoachConnectCardProps> = ({ coach, onSendUpdate }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
      setPhotoPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(resized);
      });
    } catch {
      showToast(PHOTO_READ_ERROR, 'error');
    } finally {
      input.value = '';
    }
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      showToast('Please add a short subject for your coach.', 'error');
      return;
    }
    setIsSending(true);
    try {
      await onSendUpdate(subject.trim(), message.trim(), photo);
      setSubject('');
      setMessage('');
      clearPhoto();
      showToast(`Sent to ${coach?.fullName ?? 'your coach'}.`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.03)] grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar
          src={coach?.avatarUrl}
          name={coach?.fullName || 'Coach'}
          size="lg"
          className="rounded-3xl border-2 border-white shadow-md object-cover shrink-0"
        />
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-[#7155E8] uppercase tracking-wider block">Your Coach</span>
          <h3 className="text-lg font-extrabold text-[#171717] truncate">{coach?.fullName || 'Coach'}</h3>
          {coach?.title && <p className="text-xs text-neutral-500 truncate">{coach.title}</p>}
          {coach?.phone && (
            <a
              href={`tel:${coach.phone}`}
              className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-neutral-600 hover:text-[#7155E8]"
            >
              <Phone className="w-3.5 h-3.5" />
              {coach.phone}
            </a>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
        <span className="font-bold text-[#171717] block">Send an update to your coach</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          placeholder="Subject, e.g. Knee pain after squats"
          className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#7155E8]"
        />
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          placeholder="Anything your coach should know"
          className="w-full p-2.5 bg-[#F5F5F5] border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#7155E8] leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          {photoPreview ? (
            <span className="relative inline-block">
              <img src={photoPreview} alt="Attached photo" className="w-12 h-12 rounded-xl object-cover border border-neutral-200" />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 font-semibold cursor-pointer hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-[#7155E8]">
              <Camera className="w-3.5 h-3.5" />
              Attach Photo
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
            </label>
          )}
          <button
            type="submit"
            disabled={isSending}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7155E8] hover:bg-[#6245DE] disabled:opacity-60 text-white font-bold shadow-xs active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Sending…' : 'Send to Coach'}
          </button>
        </div>
      </form>
    </div>
  );
};
