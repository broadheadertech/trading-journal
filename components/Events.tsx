'use client';

import { useState, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  CalendarDots, ArrowLeft, Check, Plus, PencilSimple, Trash, Gear,
  Globe, Stack, Clock, UploadSimple, CircleNotch, ArrowSquareOut, ArrowRight,
} from '@phosphor-icons/react';
import { MapPin } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/Toast';
import BrainMascot from '@/components/BrainMascot';

type View = 'catalog' | 'detail' | 'admin';
type Mode = 'online' | 'in_person' | 'hybrid';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ATLAS form-control chrome (matches .field .box / .codebox in app/atlas-dashboard.css)
const atlasInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 2,
  background: 'var(--panel-2)',
  color: 'var(--text)',
  padding: '10px 14px',
  fontSize: 13,
};
const atlasLabel: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  fontSize: 9.5,
  color: 'var(--muted-2)',
  letterSpacing: '.04em',
  marginBottom: 9,
};

const MODE_LABEL: Record<Mode, { label: string; icon: React.ReactNode; color: string }> = {
  online:    { label: 'Online',    icon: <Globe size={12} />,  color: 'bg-blue-500/15 text-blue-500' },
  in_person: { label: 'In-Person', icon: <MapPin size={12} />, color: 'bg-emerald-500/15 text-emerald-500' },
  hybrid:    { label: 'Hybrid',    icon: <Stack size={12} />, color: 'bg-purple-500/15 text-purple-500' },
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
    <div>
      <div className="phead">
        <p className="eyebrow" style={{ fontWeight: 500 }}>Live trainings &amp; meetups</p>
        <h2>Learn together, grow faster</h2>
        <p className="sub">Workshops, group sessions, and meetups — online or in-person.</p>
      </div>

      {events.length === 0 ? (
        <div className="blank" style={{ minHeight: 300 }}>
          <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid rgba(217,148,5,.5)' }}>
            <CalendarDots size={24} style={{ color: 'var(--amber)' }} />
          </span>
          <h4>No events yet</h4>
          <p>New trainings drop monthly — stay tuned.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {events.map((e: any) => {
            const reg = registeredIds.has(e.id);
            const isFree = e.priceUsd === 0 && e.pricePhp === 0;
            const m = MODE_LABEL[e.mode as Mode];
            return (
              <article
                key={e.id}
                className="course"
                style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedId(e.id); setView('detail'); }}
              >
                <span className="accent" />
                <div className="art">
                  {e.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.coverImage} alt={e.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <CalendarDots size={56} style={{ color: 'var(--amber)', opacity: 0.5 }} />
                  )}

                  <span
                    className="chip"
                    style={{ position: 'absolute', left: 16, top: 16, height: 22, zIndex: 1, textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700, letterSpacing: '.03em' }}
                  >
                    {m.icon} {m.label}
                  </span>

                  {reg && (
                    <span
                      className="chip"
                      style={{ position: 'absolute', right: 16, top: 16, height: 22, zIndex: 1, color: 'var(--green)', borderColor: 'var(--green)', textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700, letterSpacing: '.03em' }}
                    >
                      <Check size={11} weight="bold" /> Registered
                    </span>
                  )}

                  <span className="price" style={{ zIndex: 1 }}>{isFree ? 'Free' : `$${e.priceUsd} · ₱${e.pricePhp}`}</span>
                </div>

                <div className="body">
                  <h4 className="line-clamp-2">{e.title}</h4>
                  <p className="line-clamp-2" style={{ margin: '12px 0 0', fontSize: 13, lineHeight: '19px', color: 'var(--muted)' }}>
                    {e.description}
                  </p>

                  <div className="foot">
                    <span className="life" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={12} /> {formatDate(e.startsAt)}
                    </span>
                    <span className="go">
                      View <ArrowRight size={12} />
                    </span>
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
      <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
        <ArrowLeft size={14} /> Back to Events
      </button>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        {ev.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.coverImage} alt={ev.title} className="w-full h-64 object-cover" />
        )}
        <div className="space-y-4" style={{ padding: '24px 28px 28px' }}>
          <div className="flex items-start gap-3 flex-wrap">
            <h3 className="flex-1" style={{ fontSize: 26, lineHeight: '28px' }}>{ev.title}</h3>
            <span className="chip" style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700, letterSpacing: '.03em' }}>
              {m.icon} {m.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-4" style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {formatDate(ev.startsAt)} – {formatDate(ev.endsAt)}</span>
            {ev.timezone && <span>{ev.timezone}</span>}
            {ev.capacity && <span>Capacity: {ev.capacity}</span>}
          </div>

          <p className="whitespace-pre-wrap" style={{ maxWidth: 680, fontSize: 13.5, lineHeight: '20px', color: '#c0ccda' }}>{ev.description}</p>

          {ev.gallery && ev.gallery.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ev.gallery.map((url: string, i: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="w-full h-32 object-cover" style={{ border: '1px solid var(--line)', borderRadius: 2 }} />
              ))}
            </div>
          )}

          {/* Location / meeting — only after registration */}
          {showLocation && (
            <div className="inset space-y-2">
              <p className="lbl" style={{ textTransform: 'uppercase' }}>Access details</p>
              {(ev.mode === 'online' || ev.mode === 'hybrid') && ev.meetingUrl && (
                <a href={ev.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2" style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 12.5 }}>
                  <Globe size={14} /> Join {ev.platform || 'meeting'} <ArrowSquareOut size={12} />
                </a>
              )}
              {(ev.mode === 'in_person' || ev.mode === 'hybrid') && (ev.venueName || ev.address) && (
                <div style={{ fontSize: 13, color: '#c0ccda' }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: 700, color: 'var(--text)' }}><MapPin size={14} /> {ev.venueName}</div>
                  <div className="ml-6" style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
                    {ev.address}{ev.city ? `, ${ev.city}` : ''}{ev.country ? `, ${ev.country}` : ''}
                  </div>
                  {ev.mapUrl && (
                    <a href={ev.mapUrl} target="_blank" rel="noreferrer" className="ml-6" style={{ fontSize: 11.5, color: 'var(--amber)', fontWeight: 700 }}>
                      View on map ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            {registered ? (
              <div className="flex items-center gap-2" style={{ color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>
                <Check size={16} /> You&apos;re registered for this event.
              </div>
            ) : isFree ? (
              <button onClick={onRegisterFree} className="btn-a">
                Register (Free)
              </button>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button onClick={() => onBuy('stripe')} className="btn-a">
                  Pay ${ev.priceUsd} with Card (Stripe)
                </button>
                <button onClick={() => onBuy('paymongo')} className="btn-g">
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
          <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
            <ArrowLeft size={14} /> Back to Catalog
          </button>
        ) : <span />}
        <button onClick={() => setCreating(true)} className="btn-a">
          <Plus size={14} /> New Event
        </button>
      </div>

      <div className="phead" style={{ marginBottom: 0 }}>
        <h2>Manage Events</h2>
      </div>

      <div className="space-y-2">
        {events.map((e: any) => (
          <div key={e.id} className="inset flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{e.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
                {MODE_LABEL[e.mode as Mode].label} · {formatDate(e.startsAt)} · {e.priceUsd === 0 && e.pricePhp === 0 ? 'Free' : `$${e.priceUsd} / ₱${e.pricePhp}`} · {e.isPublished ? 'Published' : 'Draft'}
              </div>
            </div>
            <button
              onClick={() => updateEvent({ id: e.id, isPublished: !e.isPublished })}
              className="chip"
            >
              {e.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => setEditingId(e.id)} className="p-2"><PencilSimple size={14} /></button>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${e.title}"?`)) return;
                await deleteEvent({ id: e.id });
                showToast('Event deleted', 'success');
              }}
              className="p-2"
              style={{ color: 'var(--red)' }}
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
        {events.length === 0 && <p className="empty-line">No events yet.</p>}
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
      <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div className="phead" style={{ marginBottom: 0 }}>
        <h2>{event ? 'Edit Event' : 'New Event'}</h2>
      </div>

      <div className="card space-y-4">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Slug" value={slug} onChange={setSlug} placeholder="my-event" />
        <Field label="Description" value={description} onChange={setDescription} multiline />

        <FileUpload label="Cover image" value={coverImage} onChange={setCoverImage} accept="image/*" />
        <MultiImageUpload label="Gallery" value={gallery} onChange={setGallery} />

        <div className="field">
          <label style={atlasLabel}>Format</label>
          <div className="flex gap-2">
            {(['online', 'in_person', 'hybrid'] as Mode[]).map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => setMode(mm)}
                className={`chip${mode === mm ? ' on' : ''}`}
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
          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="lbl" style={{ textTransform: 'uppercase' }}>Online details</p>
            <Field label="Meeting URL" value={meetingUrl} onChange={setMeetingUrl} placeholder="https://zoom.us/j/..." />
            <Field label="Platform" value={platform} onChange={setPlatform} placeholder="Zoom, Google Meet, etc." />
          </div>
        )}

        {(mode === 'in_person' || mode === 'hybrid') && (
          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="lbl" style={{ textTransform: 'uppercase' }}>Venue details</p>
            <Field label="Venue name" value={venueName} onChange={setVenueName} />
            <Field label="Address" value={address} onChange={setAddress} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={city} onChange={setCity} />
              <Field label="Country" value={country} onChange={setCountry} />
            </div>
            <Field label="Map URL (Google Maps)" value={mapUrl} onChange={setMapUrl} />
          </div>
        )}

        <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--line)' }}>
          <Field label="Capacity (optional)" value={capacity} onChange={setCapacity} type="number" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price USD (0 = free)" value={priceUsd} onChange={setPriceUsd} type="number" />
            <Field label="Price PHP (0 = free)" value={pricePhp} onChange={setPricePhp} type="number" />
          </div>
        </div>

        <label className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text)' }}>
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Published
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={onBack} className="btn-g flex-1">Cancel</button>
          <button
            disabled={busy}
            onClick={submit}
            className="btn-a flex-1 disabled:opacity-50"
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
    <label className="field block">
      <span style={atlasLabel}>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={atlasInput}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={atlasInput}
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
    <div className="field">
      <label style={atlasLabel}>{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste URL or upload"
          className="flex-1"
          style={atlasInput}
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
          className="btn-g disabled:opacity-50"
        >
          {busy ? <CircleNotch size={14} className="animate-spin" /> : <UploadSimple size={14} />}
          Upload
        </button>
      </div>
      {value && accept.startsWith('image') && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-24 object-cover" style={{ border: '1px solid var(--line)', borderRadius: 2 }} />
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
    <div className="field">
      <label style={atlasLabel}>{label}</label>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 object-cover" style={{ border: '1px solid var(--line)', borderRadius: 2 }} />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute -top-1 -right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100"
              style={{ background: 'var(--red)', color: 'var(--ink)' }}
            >
              <Trash size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-20 w-20 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
          style={{ border: '1px dashed var(--line-2)', borderRadius: 2, background: 'var(--panel-2)', fontSize: 11.5, color: 'var(--muted-2)' }}
        >
          {busy ? <CircleNotch size={16} className="animate-spin" /> : <UploadSimple size={16} />}
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
