'use client';

import { useState, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  CalendarDays, ArrowLeft, Check, Plus, Edit2, Trash2, Settings,
  Globe, MapPin, Layers, Clock, Upload, Loader2, ExternalLink, ArrowRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import BrainMascot from '@/components/BrainMascot';

type View = 'catalog' | 'detail' | 'admin';
type Mode = 'online' | 'in_person' | 'hybrid';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const MODE_LABEL: Record<Mode, { label: string; icon: React.ReactNode; color: string }> = {
  online:    { label: 'Online',    icon: <Globe size={12} />,  color: 'bg-blue-500/15 text-blue-500' },
  in_person: { label: 'In-Person', icon: <MapPin size={12} />, color: 'bg-emerald-500/15 text-emerald-500' },
  hybrid:    { label: 'Hybrid',    icon: <Layers size={12} />, color: 'bg-purple-500/15 text-purple-500' },
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Events() {
  const { showToast } = useToast();

  const [view, setView] = useState<View>('catalog');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = useQuery(api.events.listPublished) ?? [];
  const myRegs = useQuery(api.events.myRegistrations) ?? [];
  const registerFree = useMutation(api.events.registerFree);

  const registeredIds = useMemo(
    () => new Set(myRegs.map((r: any) => r.eventId)),
    [myRegs],
  );

  const handleBuy = async (eventId: string, provider: 'stripe' | 'paymongo') => {
    try {
      const res = await fetch(`/api/events/checkout/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast(data.error || 'Checkout failed', 'error');
    } catch {
      showToast('Checkout failed', 'error');
    }
  };

  const handleRegisterFree = async (eventId: string) => {
    try {
      await registerFree({ eventId });
      showToast('Registered!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
    }
  };

  if (view === 'detail' && selectedId) {
    return (
      <EventDetail
        eventId={selectedId}
        registered={registeredIds.has(selectedId)}
        onBack={() => setView('catalog')}
        onBuy={(p) => handleBuy(selectedId, p)}
        onRegisterFree={() => handleRegisterFree(selectedId)}
      />
    );
  }

  return (
    <div className="relative space-y-10">
      <div className="hero-glow" />

      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live trainings & meetups
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Learn together, <span className="gradient-text">grow faster</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Workshops, group sessions, and meetups — online or in-person.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 backdrop-blur p-16 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center">
            <CalendarDays size={28} className="text-teal-400" />
          </div>
          <p className="text-[var(--foreground)] font-medium">No events yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">New trainings drop monthly — stay tuned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((e: any, idx: number) => {
            const reg = registeredIds.has(e.id);
            const isFree = e.priceUsd === 0 && e.pricePhp === 0;
            const m = MODE_LABEL[e.mode as Mode];
            return (
              <article
                key={e.id}
                style={{ animationDelay: `${idx * 60}ms` }}
                className="group relative flex flex-col overflow-hidden rounded-3xl glass card-lift anim-fade-up cursor-pointer"
                onClick={() => { setSelectedId(e.id); setView('detail'); }}
              >
                <div className="relative h-44 overflow-hidden">
                  {e.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.coverImage} alt={e.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-500/30 via-teal-600/20 to-emerald-500/10 flex items-center justify-center">
                      <CalendarDays size={56} className="text-white/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

                  {reg && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-wide shadow-lg">
                      <Check size={11} strokeWidth={3} /> Registered
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold uppercase tracking-wide`}>
                      {m.icon} {m.label}
                    </span>
                    {isFree ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-wide">Free</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
                        ${e.priceUsd} · ₱{e.pricePhp}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-5 gap-2">
                  <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight leading-snug line-clamp-2">{e.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{e.description}</p>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <Clock size={12} /> {formatDate(e.startsAt)}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-teal-400 group-hover:gap-2 transition-all">
                      View <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function EventDetail({
  eventId, registered, onBack, onBuy, onRegisterFree,
}: {
  eventId: string;
  registered: boolean;
  onBack: () => void;
  onBuy: (provider: 'stripe' | 'paymongo') => void;
  onRegisterFree: () => void;
}) {
  const ev = useQuery(api.events.getById, { id: eventId });
  if (!ev) return (
    <div className="flex items-center justify-center py-20">
      <BrainMascot size={48} glow beat />
    </div>
  );

  const isFree = ev.priceUsd === 0 && ev.pricePhp === 0;
  const m = MODE_LABEL[ev.mode as Mode];
  const showLocation = registered;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to Events
      </button>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {ev.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.coverImage} alt={ev.title} className="w-full h-64 object-cover" />
        )}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--foreground)] flex-1">{ev.title}</h1>
            <span className={`text-xs uppercase px-2 py-1 rounded-full font-medium flex items-center gap-1 ${m.color}`}>
              {m.icon} {m.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5"><Clock size={14} /> {formatDate(ev.startsAt)} – {formatDate(ev.endsAt)}</span>
            {ev.timezone && <span>{ev.timezone}</span>}
            {ev.capacity && <span>Capacity: {ev.capacity}</span>}
          </div>

          <p className="text-[var(--foreground)] whitespace-pre-wrap">{ev.description}</p>

          {ev.gallery && ev.gallery.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ev.gallery.map((url: string, i: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg border border-[var(--border)]" />
              ))}
            </div>
          )}

          {/* Location / meeting — only after registration */}
          {showLocation && (
            <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--background)] space-y-2">
              <div className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Access details</div>
              {(ev.mode === 'online' || ev.mode === 'hybrid') && ev.meetingUrl && (
                <a href={ev.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--accent)] hover:underline">
                  <Globe size={14} /> Join {ev.platform || 'meeting'} <ExternalLink size={12} />
                </a>
              )}
              {(ev.mode === 'in_person' || ev.mode === 'hybrid') && (ev.venueName || ev.address) && (
                <div className="text-sm text-[var(--foreground)]">
                  <div className="flex items-center gap-2 font-medium"><MapPin size={14} /> {ev.venueName}</div>
                  <div className="text-[var(--muted-foreground)] text-xs ml-6">
                    {ev.address}{ev.city ? `, ${ev.city}` : ''}{ev.country ? `, ${ev.country}` : ''}
                  </div>
                  {ev.mapUrl && (
                    <a href={ev.mapUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline ml-6">
                      View on map ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-4">
            {registered ? (
              <div className="text-emerald-500 font-medium flex items-center gap-2">
                <Check size={16} /> You're registered for this event.
              </div>
            ) : isFree ? (
              <button
                onClick={onRegisterFree}
                className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90"
              >
                Register (Free)
              </button>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onBuy('stripe')}
                  className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90"
                >
                  Pay ${ev.priceUsd} with Card (Stripe)
                </button>
                <button
                  onClick={() => onBuy('paymongo')}
                  className="px-5 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-xl font-medium hover:bg-[var(--muted)]"
                >
                  Pay ₱{ev.pricePhp} with GCash/Card (PayMongo)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Admin
// ──────────────────────────────────────────────────────────────────────
export function AdminEvents({ onBack }: { onBack?: () => void }) {
  const { showToast } = useToast();
  const events = useQuery(api.events.listAll) ?? [];
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const editing = events.find((e: any) => e.id === editingId);

  if (creating) {
    return <EventForm onBack={() => setCreating(false)} />;
  }
  if (editing) {
    return <EventForm event={editing} onBack={() => setEditingId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft size={16} /> Back to Catalog
          </button>
        ) : <span />}
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      <h1 className="text-2xl font-bold text-[var(--foreground)]">Manage Events</h1>

      <div className="space-y-2">
        {events.map((e: any) => (
          <div key={e.id} className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--foreground)] truncate">{e.title}</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {MODE_LABEL[e.mode as Mode].label} · {formatDate(e.startsAt)} · {e.priceUsd === 0 && e.pricePhp === 0 ? 'Free' : `$${e.priceUsd} / ₱${e.pricePhp}`} · {e.isPublished ? 'Published' : 'Draft'}
              </div>
            </div>
            <button
              onClick={() => updateEvent({ id: e.id, isPublished: !e.isPublished })}
              className="text-xs px-3 py-1 rounded-lg border border-[var(--border)]"
            >
              {e.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => setEditingId(e.id)} className="p-2 rounded-lg hover:bg-[var(--muted)]"><Edit2 size={14} /></button>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${e.title}"?`)) return;
                await deleteEvent({ id: e.id });
                showToast('Event deleted', 'success');
              }}
              className="p-2 rounded-lg hover:bg-[var(--red)]/10 text-[var(--red)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {events.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No events yet.</p>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function EventForm({ event, onBack }: { event?: any; onBack: () => void }) {
  const { showToast } = useToast();
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);

  const [title, setTitle] = useState(event?.title ?? '');
  const [slug, setSlug] = useState(event?.slug ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [coverImage, setCoverImage] = useState(event?.coverImage ?? '');
  const [gallery, setGallery] = useState<string[]>(event?.gallery ?? []);
  const [mode, setMode] = useState<Mode>(event?.mode ?? 'online');
  const [startsAt, setStartsAt] = useState(event?.startsAt?.slice(0, 16) ?? '');
  const [endsAt, setEndsAt] = useState(event?.endsAt?.slice(0, 16) ?? '');
  const [timezone, setTimezone] = useState(event?.timezone ?? '');
  const [meetingUrl, setMeetingUrl] = useState(event?.meetingUrl ?? '');
  const [platform, setPlatform] = useState(event?.platform ?? '');
  const [venueName, setVenueName] = useState(event?.venueName ?? '');
  const [address, setAddress] = useState(event?.address ?? '');
  const [city, setCity] = useState(event?.city ?? '');
  const [country, setCountry] = useState(event?.country ?? '');
  const [mapUrl, setMapUrl] = useState(event?.mapUrl ?? '');
  const [capacity, setCapacity] = useState(event?.capacity ? String(event.capacity) : '');
  const [priceUsd, setPriceUsd] = useState(String(event?.priceUsd ?? '0'));
  const [pricePhp, setPricePhp] = useState(String(event?.pricePhp ?? '0'));
  const [isPublished, setIsPublished] = useState(event?.isPublished ?? false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title || !slug || !startsAt || !endsAt) {
      showToast('Title, slug, start and end are required', 'error');
      return;
    }
    setBusy(true);
    const payload = {
      title, slug, description,
      coverImage: coverImage || undefined,
      gallery: gallery.length ? gallery : undefined,
      mode,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      timezone: timezone || undefined,
      meetingUrl: meetingUrl || undefined,
      platform: platform || undefined,
      venueName: venueName || undefined,
      address: address || undefined,
      city: city || undefined,
      country: country || undefined,
      mapUrl: mapUrl || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      priceUsd: Number(priceUsd) || 0,
      pricePhp: Number(pricePhp) || 0,
      isPublished,
    };
    try {
      if (event) {
        await updateEvent({ id: event.id, ...payload });
        showToast('Event updated', 'success');
      } else {
        await createEvent({ id: uid(), ...payload });
        showToast('Event created', 'success');
      }
      onBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-[var(--foreground)]">{event ? 'Edit Event' : 'New Event'}</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Slug" value={slug} onChange={setSlug} placeholder="my-event" />
        <Field label="Description" value={description} onChange={setDescription} multiline />

        <FileUpload label="Cover image" value={coverImage} onChange={setCoverImage} accept="image/*" />
        <MultiImageUpload label="Gallery" value={gallery} onChange={setGallery} />

        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Format</div>
          <div className="flex gap-2">
            {(['online', 'in_person', 'hybrid'] as Mode[]).map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => setMode(mm)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${
                  mode === mm ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'
                }`}
              >
                {MODE_LABEL[mm].icon} {MODE_LABEL[mm].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Starts at" value={startsAt} onChange={setStartsAt} type="datetime-local" />
          <Field label="Ends at" value={endsAt} onChange={setEndsAt} type="datetime-local" />
        </div>
        <Field label="Timezone (optional)" value={timezone} onChange={setTimezone} placeholder="Asia/Manila" />

        {(mode === 'online' || mode === 'hybrid') && (
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <div className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Online details</div>
            <Field label="Meeting URL" value={meetingUrl} onChange={setMeetingUrl} placeholder="https://zoom.us/j/..." />
            <Field label="Platform" value={platform} onChange={setPlatform} placeholder="Zoom, Google Meet, etc." />
          </div>
        )}

        {(mode === 'in_person' || mode === 'hybrid') && (
          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <div className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Venue details</div>
            <Field label="Venue name" value={venueName} onChange={setVenueName} />
            <Field label="Address" value={address} onChange={setAddress} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={city} onChange={setCity} />
              <Field label="Country" value={country} onChange={setCountry} />
            </div>
            <Field label="Map URL (Google Maps)" value={mapUrl} onChange={setMapUrl} />
          </div>
        )}

        <div className="border-t border-[var(--border)] pt-4 space-y-3">
          <Field label="Capacity (optional)" value={capacity} onChange={setCapacity} type="number" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price USD (0 = free)" value={priceUsd} onChange={setPriceUsd} type="number" />
            <Field label="Price PHP (0 = free)" value={pricePhp} onChange={setPricePhp} type="number" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm">Cancel</button>
          <button
            disabled={busy}
            onClick={submit}
            className="flex-1 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shared field components (local to keep this file self-contained)
// ──────────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', multiline, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)]"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)]"
        />
      )}
    </label>
  );
}

function FileUpload({
  label, value, onChange, accept,
}: {
  label: string; value: string; onChange: (url: string) => void; accept: string;
}) {
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      const r = await fetch('/api/events/resolve-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageId }),
      });
      const { url } = await r.json();
      onChange(url);
      showToast('Uploaded', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{label}</div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste URL or upload"
          className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)]"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm flex items-center gap-1.5 hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload
        </button>
      </div>
      {value && accept.startsWith('image') && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-24 rounded-lg object-cover border border-[var(--border)]" />
      )}
    </div>
  );
}

function MultiImageUpload({
  label, value, onChange,
}: {
  label: string; value: string[]; onChange: (urls: string[]) => void;
}) {
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
        if (!res.ok) throw new Error('Upload failed');
        const { storageId } = await res.json();
        const r = await fetch('/api/events/resolve-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storageId }),
        });
        const { url } = await r.json();
        uploaded.push(url);
      }
      onChange([...value, ...uploaded]);
      showToast(`Uploaded ${uploaded.length} image(s)`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-[var(--border)]" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute -top-1 -right-1 bg-[var(--red)] text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-20 w-20 flex flex-col items-center justify-center gap-1 border border-dashed border-[var(--border)] rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {busy ? 'Uploading' : 'Add'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
