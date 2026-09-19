'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, Mail, User, Pencil, Camera, X, Check } from 'lucide-react';

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  photo: string | null;
}

interface ProfileCardProps {
  displayName: string | null;
  email: string | null;
  setDisplayName: (name: string) => void;
}

const STORAGE_KEY = 'nexus_profile';

export function ProfileCard({ displayName, email, setDisplayName }: ProfileCardProps) {
  const [profile, setProfile] = useState<ProfileData>({
    name: displayName || '',
    phone: '',
    email: email || '',
    photo: null,
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<ProfileData>;
        setProfile({
          name: data.name || displayName || '',
          phone: data.phone || '',
          email: data.email || email || '',
          photo: data.photo || null,
        });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [displayName, email]);

  const startEdit = () => {
    setName(profile.name || displayName || '');
    setPhone(profile.phone);
    setEmailEdit(profile.email || email || '');
    setPhotoDraft(profile.photo);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPhotoDraft(null);
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoDraft(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const save = () => {
    const next: ProfileData = {
      name: name.trim() || profile.name,
      phone: phone.trim(),
      email: emailEdit.trim() || profile.email,
      photo: photoDraft,
    };
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage cheio (foto grande) — mantém só em memória
    }
    if (next.name) setDisplayName(next.name);
    setEditing(false);
  };

  const photo = editing ? photoDraft : profile.photo;

  if (editing) {
    return (
      <div className="w-full max-w-[320px] rounded-xl bg-white dark:bg-slate-800 shadow-xl p-4 flex flex-col gap-3 border-2 border-transparent bg-clip-padding border-sky-500/60">
        <h2 className="text-base font-bold text-slate-800 dark:text-white text-center">Editar perfil</h2>

        <div className="flex flex-col items-center gap-2">
<div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-700 p-[3px] bg-gradient-to-br from-purple-500 via-pink-500 to-sky-400">
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo} alt="Foto do perfil" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-slate-400" aria-hidden="true" />
          )}
        </div>
      </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 px-3 py-1.5 rounded-full border border-sky-400/60 hover:bg-sky-50 dark:hover:bg-sky-900/40 transition"
          >
            <Camera className="w-3.5 h-3.5" />
            {photoDraft || profile.photo ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} aria-label="Escolher foto do perfil" />
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="profile-name" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Telefone
            </label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              E-mail
            </label>
            <input
              id="profile-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={emailEdit}
              onChange={(e) => setEmailEdit(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="voce@exemplo.com"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            className="flex-1 inline-flex items-center justify-center gap-1 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 rounded-lg py-2 hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-95 transition"
          >
            <Check className="w-4 h-4" />
            Salvar
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="flex-1 inline-flex items-center justify-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg py-2 hover:scale-[1.02] active:scale-95 transition"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

return (
    <div className="shrink-0 rounded-full p-[2px] animate-gradient-border shadow-lg max-w-full"
      style={{ background: 'conic-gradient(from var(--angle), transparent 0%, #8b5cf6 8%, #ec4899 16%, transparent 28%, transparent 55%, #3b82f6 66%, #06b6d4 74%, transparent 88%)' }}>
    <div className="flex items-center gap-2 md:gap-2.5 rounded-full bg-white dark:bg-slate-800 pl-1.5 pr-1.5 py-1.5 min-w-0 transition-all duration-300 group">
      <div className="w-10 h-10 md:w-11 md:h-11 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center ring-2 ring-sky-400/50">
        {profile.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={profile.photo} alt={`Foto de ${profile.name || 'perfil'}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <User className="w-5 h-5 text-slate-300 dark:text-slate-500" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {profile.name || 'Nexus'}
        </p>
        <div className="hidden sm:flex items-center gap-x-2.5 gap-y-0.5 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1 min-w-0">
            <Phone className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0" aria-hidden="true" />
            <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[110px]">
              {profile.phone || '—'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <Mail className="w-3 h-3 text-purple-500 dark:text-purple-400 shrink-0" aria-hidden="true" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
              {profile.email || email || ''}
            </span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={startEdit}
        className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-purple-500 text-white flex items-center justify-center hover:brightness-110 hover:scale-105 active:scale-95 transition"
        aria-label="Editar perfil"
        title="Editar perfil"
      >
        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
    </div>
  );
}