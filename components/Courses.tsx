'use client';

import { useState, useMemo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  GraduationCap, ArrowLeft, ArrowRight, Lock, Check, Plus, Edit2, Trash2,
  ExternalLink, PlayCircle, FileText, Link as LinkIcon, Settings, Upload, Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import BrainMascot from '@/components/BrainMascot';

type View = 'catalog' | 'detail' | 'admin';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ATLAS form-control chrome (matches .field .box in app/atlas-dashboard.css)
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

export default function Courses() {
  const { showToast } = useToast();

  const [view, setView] = useState<View>('catalog');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const courses = useQuery(api.courses.listPublished) ?? [];
  const myPurchases = useQuery(api.courses.myPurchases) ?? [];

  const purchasedIds = useMemo(
    () => new Set(myPurchases.map((p: any) => p.courseId)),
    [myPurchases],
  );

  const handleBuy = async (courseId: string, provider: 'stripe' | 'paymongo') => {
    try {
      const res = await fetch(`/api/courses/checkout/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Checkout failed', 'error');
      }
    } catch {
      showToast('Checkout failed', 'error');
    }
  };

  if (view === 'detail' && selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        purchased={purchasedIds.has(selectedCourseId)}
        onBack={() => setView('catalog')}
        onBuy={(p) => handleBuy(selectedCourseId, p)}
      />
    );
  }

  return (
    <div className="pwrap">
      <div className="phead">
        <p className="eyebrow">
          <span style={{ width: 7, height: 7, borderRadius: 1, background: 'var(--green)', flex: 'none' }} />
          New courses every month
        </p>
        <h2>Level up your trading edge</h2>
        <p className="sub">
          Buy individual courses to unlock lifetime access. Learn at your pace, from your dashboard.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="blank">
          <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
          <span className="corner" style={{ right: 0, top: 0, borderLeft: 0, borderBottom: 0 }} />
          <span className="corner" style={{ left: 0, bottom: 0, borderRight: 0, borderTop: 0 }} />
          <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />
          <span className="badge" style={{ border: '1px solid var(--amber)', color: 'var(--amber)' }}>
            <GraduationCap size={24} />
          </span>
          <h4>No courses yet</h4>
          <p>Check back soon — new content drops monthly.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {courses.map((c: any) => {
            const owned = purchasedIds.has(c.id);
            return (
              <article
                key={c.id}
                className="course"
                style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedCourseId(c.id); setView('detail'); }}
              >
                <span className="accent" />
                <div className="art">
                  {c.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <GraduationCap size={56} style={{ color: 'var(--amber)', opacity: 0.7 }} />
                  )}

                  {owned && (
                    <span className="pill" style={{ position: 'absolute', right: 16, top: 16 }}>
                      <Check size={10} strokeWidth={3} style={{ marginRight: 6 }} /> OWNED
                    </span>
                  )}

                  <span className="price">${c.priceUsd} · ₱{c.pricePhp}</span>
                </div>

                <div className="body">
                  <h4 className="line-clamp-2">{c.title}</h4>
                  <p className="line-clamp-2" style={{ margin: '14px 0 0', fontSize: 13, lineHeight: '19px', color: 'var(--muted)' }}>
                    {c.description}
                  </p>

                  <div className="foot">
                    <span className="life">Lifetime access</span>
                    <span className="go">
                      {owned ? 'Continue' : 'View course'}
                      <ArrowRight size={12} />
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
// Course Detail
// ──────────────────────────────────────────────────────────────────────
function CourseDetail({
  courseId, purchased, onBack, onBuy,
}: {
  courseId: string;
  purchased: boolean;
  onBack: () => void;
  onBuy: (provider: 'stripe' | 'paymongo') => void;
}) {
  const course = useQuery(api.courses.getById, { id: courseId });
  const structure = useQuery(api.courses.getStructure, { courseId });
  const progress = useQuery(api.courses.myProgressForCourse, { courseId }) ?? [];
  const markComplete = useMutation(api.courses.markLessonComplete);
  const unmarkComplete = useMutation(api.courses.unmarkLessonComplete);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const completedSet = useMemo(
    () => new Set(progress.map((p: any) => p.lessonId)),
    [progress],
  );

  if (!course || !structure) {
    return (
      <div className="flex items-center justify-center py-20">
        <BrainMascot size={48} glow beat />
      </div>
    );
  }

  const modules = structure.modules;
  const lessonsByModule = (mid: string) => structure.lessons.filter((l: any) => l.moduleId === mid);
  const activeLesson = structure.lessons.find((l: any) => l.id === activeLessonId);

  if (!purchased) {
    return (
      <div className="pwrap">
        <button onClick={onBack} className="doclink" style={{ marginTop: 0, marginBottom: 22 }}>
          <ArrowLeft size={14} /> Back to Courses
        </button>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          {course.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImage} alt={course.title} style={{ width: '100%', height: 256, objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '25px 28px 34px' }}>
            <h3 style={{ fontSize: 26, lineHeight: '28px' }}>{course.title}</h3>
            <p className="sub" style={{ maxWidth: 680, fontSize: 13.5, lineHeight: '21px', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{course.description}</p>

            {course.gallery && course.gallery.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginTop: 22 }}>
                {course.gallery.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" style={{ width: '100%', height: 128, objectFit: 'cover', border: '1px solid var(--line)', borderRadius: 2 }} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
              <span className="chip">
                <Lock size={12} /> Buy this course to unlock {modules.length} modules / {structure.lessons.length} lessons
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
                <button onClick={() => onBuy('stripe')} className="btn-a">
                  Pay ${course.priceUsd} with Card (Stripe)
                </button>
                <button onClick={() => onBuy('paymongo')} className="btn-g">
                  Pay ₱{course.pricePhp} with GCash/Card (PayMongo)
                </button>
              </div>
              {course.externalUrl && (
                <a href={course.externalUrl} target="_blank" rel="noreferrer" className="doclink">
                  Preview course externally <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Purchased — show learning view
  return (
    <div className="pwrap">
      <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
        <ArrowLeft size={14} /> Back to Courses
      </button>

      <div className="phead" style={{ marginTop: 18, marginBottom: 24 }}>
        <h2>{course.title}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,280px) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        {/* Sidebar: modules + lessons */}
        <div className="card" style={{ padding: '19px 16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {modules.length === 0 ? (
            <p className="sub">No modules yet.</p>
          ) : modules.map((m: any) => (
            <div key={m.id} style={{ marginBottom: 18 }}>
              <p className="lbl b10" style={{ marginBottom: 10, textTransform: 'uppercase' }}>{m.title}</p>
              <div>
                {lessonsByModule(m.id).map((l: any) => {
                  const done = completedSet.has(l.id);
                  const active = activeLessonId === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActiveLessonId(l.id)}
                      className={active ? 'chip on' : 'chip'}
                      style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', marginBottom: 6, height: 32 }}
                    >
                      {done ? <Check size={12} style={{ color: active ? 'var(--ink)' : 'var(--green)' }} /> :
                        l.contentType === 'video' ? <PlayCircle size={12} /> :
                        l.contentType === 'link' ? <LinkIcon size={12} /> : <FileText size={12} />}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{l.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Lesson content */}
        <div className="card" style={{ padding: '25px 28px 34px', minHeight: 400 }}>
          <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
          {!activeLesson ? (
            <p className="sub">Select a lesson to begin.</p>
          ) : (
            <>
              <h3 style={{ fontSize: 22, lineHeight: '24px' }}>{activeLesson.title}</h3>

              {activeLesson.contentType === 'video' && activeLesson.videoUrl && (
                <div style={{ aspectRatio: '16 / 9', background: '#070c13', border: '1px solid var(--line)', borderRadius: 2, overflow: 'hidden', marginTop: 20 }}>
                  {/youtube\.com|youtu\.be|vimeo\.com/.test(activeLesson.videoUrl) ? (
                    <iframe
                      src={activeLesson.videoUrl}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={activeLesson.videoUrl} controls style={{ width: '100%', height: '100%' }} />
                  )}
                </div>
              )}

              {activeLesson.contentType === 'link' && activeLesson.externalUrl && (
                <a
                  href={activeLesson.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-a"
                  style={{ marginTop: 20 }}
                >
                  Open external resource <ExternalLink size={14} />
                </a>
              )}

              {activeLesson.body && (
                <p style={{ maxWidth: 680, margin: '20px 0 0', fontSize: 13.5, lineHeight: '21px', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
                  {activeLesson.body}
                </p>
              )}

              <div style={{ marginTop: 26, paddingTop: 22, borderTop: '1px solid var(--line)' }}>
                {completedSet.has(activeLesson.id) ? (
                  <button
                    onClick={() => unmarkComplete({ lessonId: activeLesson.id })}
                    className="btn-g"
                    style={{ height: 36, fontSize: 12.5 }}
                  >
                    Mark as incomplete
                  </button>
                ) : (
                  <button
                    onClick={() => markComplete({ lessonId: activeLesson.id, courseId })}
                    className="btn-a"
                    style={{ height: 36, fontSize: 12.5 }}
                  >
                    <Check size={12} /> Mark as complete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Admin Authoring
// ──────────────────────────────────────────────────────────────────────
export function AdminCourses({ onBack }: { onBack?: () => void }) {
  const { showToast } = useToast();
  const courses = useQuery(api.courses.listAll) ?? [];
  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);
  const deleteCourse = useMutation(api.courses.deleteCourse);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const editing = courses.find((c: any) => c.id === editingId) ?? null;

  if (editing) {
    return <AdminCourseEditor course={editing} onBack={() => setEditingId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
            <ArrowLeft size={14} /> Back to Catalog
          </button>
        ) : <span />}
        <button onClick={() => setShowNew(true)} className="btn-a">
          <Plus size={14} /> New Course
        </button>
      </div>

      <div className="phead" style={{ marginBottom: 0 }}>
        <h2>Manage Courses</h2>
      </div>

      <div className="space-y-2">
        {courses.map((c: any) => (
          <div key={c.id} className="inset flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-2)', fontFamily: 'var(--mono)' }}>
                ${c.priceUsd} · ₱{c.pricePhp} · {c.isPublished ? 'Published' : 'Draft'}
              </div>
            </div>
            <button
              onClick={() => updateCourse({ id: c.id, isPublished: !c.isPublished })}
              className="chip"
            >
              {c.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => setEditingId(c.id)} className="p-2">
              <Edit2 size={14} />
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
                await deleteCourse({ id: c.id });
                showToast('Course deleted', 'success');
              }}
              className="p-2"
              style={{ color: 'var(--red)' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {courses.length === 0 && <p className="empty-line">No courses yet.</p>}
      </div>

      {showNew && (
        <NewCourseModal
          onClose={() => setShowNew(false)}
          onCreate={async (data) => {
            await createCourse({ id: uid(), ...data });
            setShowNew(false);
            showToast('Course created', 'success');
          }}
        />
      )}
    </div>
  );
}

function NewCourseModal({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    slug: string; title: string; description: string;
    coverImage?: string; priceUsd: number; pricePhp: number;
    externalUrl?: string; isPublished: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [priceUsd, setPriceUsd] = useState('29');
  const [pricePhp, setPricePhp] = useState('1499');
  const [externalUrl, setExternalUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(3,6,10,.78)' }}
      onClick={onClose}
    >
      <div
        className="modal w-full max-w-lg"
        style={{ padding: 0, textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="accent" style={{ width: 90 }} />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 20, lineHeight: '22px' }}>New Course</h2>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Slug" value={slug} onChange={setSlug} placeholder="my-course-slug" />
          <Field label="Description" value={description} onChange={setDescription} multiline />
          <FileUpload label="Cover image" value={coverImage} onChange={setCoverImage} accept="image/*" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price USD" value={priceUsd} onChange={setPriceUsd} type="number" />
            <Field label="Price PHP" value={pricePhp} onChange={setPricePhp} type="number" />
          </div>
          <Field label="External URL (optional)" value={externalUrl} onChange={setExternalUrl} />
          <label className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text)' }}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Publish immediately
          </label>
        </div>

        <div className="flex gap-2" style={{ padding: '18px 24px', borderTop: '1px solid var(--line)' }}>
          <button onClick={onClose} className="btn-g flex-1">Cancel</button>
          <button
            disabled={busy || !title || !slug}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate({
                  title, slug, description,
                  coverImage: coverImage || undefined,
                  priceUsd: Number(priceUsd) || 0,
                  pricePhp: Number(pricePhp) || 0,
                  externalUrl: externalUrl || undefined,
                  isPublished,
                });
              } finally {
                setBusy(false);
              }
            }}
            className="btn-a flex-1 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileUpload({
  label, value, onChange, accept,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept: string;
}) {
  const generateUploadUrl = useMutation(api.courses.generateUploadUrl);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      // Resolve to permanent URL via Convex
      const r = await fetch('/api/courses/resolve-storage', {
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
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
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
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const generateUploadUrl = useMutation(api.courses.generateUploadUrl);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!res.ok) throw new Error('Upload failed');
        const { storageId } = await res.json();
        const r = await fetch('/api/courses/resolve-storage', {
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
              <Trash2 size={10} />
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

// ──────────────────────────────────────────────────────────────────────
// Course Editor — modules + lessons
// ──────────────────────────────────────────────────────────────────────
function AdminCourseEditor({ course, onBack }: { course: any; onBack: () => void }) {
  const { showToast } = useToast();
  const structure = useQuery(api.courses.getStructure, { courseId: course.id });
  const updateCourse = useMutation(api.courses.updateCourse);
  const createModule = useMutation(api.courses.createModule);
  const updateModule = useMutation(api.courses.updateModule);
  const deleteModule = useMutation(api.courses.deleteModule);
  const createLesson = useMutation(api.courses.createLesson);
  const updateLesson = useMutation(api.courses.updateLesson);
  const deleteLesson = useMutation(api.courses.deleteLesson);

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [priceUsd, setPriceUsd] = useState(String(course.priceUsd));
  const [pricePhp, setPricePhp] = useState(String(course.pricePhp));
  const [coverImage, setCoverImage] = useState(course.coverImage ?? '');
  const [gallery, setGallery] = useState<string[]>(course.gallery ?? []);

  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const modules = structure?.modules ?? [];
  const lessons = structure?.lessons ?? [];
  const editingLesson = lessons.find((l: any) => l.id === editingLessonId);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="doclink" style={{ marginTop: 0 }}>
        <ArrowLeft size={14} /> Back to Manage
      </button>

      <div className="phead" style={{ marginBottom: 0 }}>
        <h2>Edit: {course.title}</h2>
      </div>

      {/* Course meta */}
      <div className="card space-y-4">
        <span className="accent" style={{ width: 56, background: 'var(--amber)' }} />
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Description" value={description} onChange={setDescription} multiline />
        <FileUpload label="Cover image" value={coverImage} onChange={setCoverImage} accept="image/*" />
        <MultiImageUpload label="Gallery" value={gallery} onChange={setGallery} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price USD" value={priceUsd} onChange={setPriceUsd} type="number" />
          <Field label="Price PHP" value={pricePhp} onChange={setPricePhp} type="number" />
        </div>
        <button
          onClick={async () => {
            await updateCourse({
              id: course.id,
              title, description, coverImage: coverImage || undefined,
              gallery,
              priceUsd: Number(priceUsd) || 0,
              pricePhp: Number(pricePhp) || 0,
            });
            showToast('Course updated', 'success');
          }}
          className="btn-a"
        >
          Save course details
        </button>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, lineHeight: '18px', margin: 0, color: 'var(--text)' }}>Modules</h3>

        <div className="flex gap-2">
          <input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="New module title"
            className="flex-1"
            style={atlasInput}
          />
          <button
            disabled={!newModuleTitle}
            onClick={async () => {
              await createModule({
                id: uid(),
                courseId: course.id,
                title: newModuleTitle,
                order: modules.length,
              });
              setNewModuleTitle('');
            }}
            className="btn-a disabled:opacity-50"
          >
            <Plus size={14} /> Add Module
          </button>
        </div>

        {modules.map((m: any) => {
          const moduleLessons = lessons.filter((l: any) => l.moduleId === m.id);
          return (
            <div key={m.id} className="card space-y-2">
              <div className="flex items-center gap-2">
                <input
                  defaultValue={m.title}
                  onBlur={(e) => {
                    if (e.target.value !== m.title) updateModule({ id: m.id, title: e.target.value });
                  }}
                  className="flex-1 bg-transparent focus:outline-none"
                  style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}
                />
                <button
                  onClick={async () => {
                    if (!confirm(`Delete module "${m.title}" and its lessons?`)) return;
                    await deleteModule({ id: m.id });
                  }}
                  className="p-2"
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="pl-4">
                {moduleLessons.map((l: any) => (
                  <div key={l.id} className="mrow">
                    <FileText size={12} className="ic" />
                    <span className="lb flex-1" style={{ color: 'var(--text)' }}>{l.title}</span>
                    <button onClick={() => setEditingLessonId(l.id)} className="p-1" style={{ color: 'var(--muted-2)' }}><Edit2 size={12} /></button>
                    <button onClick={() => deleteLesson({ id: l.id })} className="p-1" style={{ color: 'var(--red)' }}><Trash2 size={12} /></button>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    const id = uid();
                    await createLesson({
                      id,
                      moduleId: m.id,
                      courseId: course.id,
                      title: 'New lesson',
                      order: moduleLessons.length,
                      contentType: 'text',
                      body: '',
                    });
                    setEditingLessonId(id);
                  }}
                  className="flex items-center gap-2"
                  style={{ marginTop: 12, fontWeight: 700, fontSize: 12, color: 'var(--amber)' }}
                >
                  <Plus size={12} /> Add lesson
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingLesson && (
        <LessonEditorModal
          lesson={editingLesson}
          onClose={() => setEditingLessonId(null)}
          onSave={async (patch) => {
            await updateLesson({ id: editingLesson.id, ...patch });
            setEditingLessonId(null);
            showToast('Lesson saved', 'success');
          }}
        />
      )}
    </div>
  );
}

function LessonEditorModal({
  lesson, onClose, onSave,
}: {
  lesson: any;
  onClose: () => void;
  onSave: (patch: {
    title?: string; contentType?: 'text' | 'video' | 'link';
    body?: string; videoUrl?: string; externalUrl?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [contentType, setContentType] = useState<'text' | 'video' | 'link'>(lesson.contentType);
  const [body, setBody] = useState(lesson.body);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl ?? '');
  const [externalUrl, setExternalUrl] = useState(lesson.externalUrl ?? '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(3,6,10,.78)' }}
      onClick={onClose}
    >
      <div
        className="modal w-full max-w-2xl"
        style={{ padding: 0, textAlign: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="accent" style={{ width: 90 }} />
        <span className="corner" style={{ left: 0, top: 0, borderRight: 0, borderBottom: 0 }} />
        <span className="corner" style={{ right: 0, bottom: 0, borderLeft: 0, borderTop: 0 }} />

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: 20, lineHeight: '22px' }}>Edit Lesson</h2>
        </div>

        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          <Field label="Title" value={title} onChange={setTitle} />

          <div className="field">
            <label style={atlasLabel}>Content type</label>
            <div className="flex gap-2">
              {(['text', 'video', 'link'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setContentType(t)}
                  className={`chip${contentType === t ? ' on' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {contentType === 'video' && <FileUpload label="Video file (or paste embed URL)" value={videoUrl} onChange={setVideoUrl} accept="video/*" />}
          {contentType === 'link' && <Field label="External URL" value={externalUrl} onChange={setExternalUrl} />}

          <Field label="Body / notes" value={body} onChange={setBody} multiline />
        </div>

        <div className="flex gap-2" style={{ padding: '18px 24px', borderTop: '1px solid var(--line)' }}>
          <button onClick={onClose} className="btn-g flex-1">Cancel</button>
          <button
            onClick={() => onSave({ title, contentType, body, videoUrl: videoUrl || undefined, externalUrl: externalUrl || undefined })}
            className="btn-a flex-1"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
