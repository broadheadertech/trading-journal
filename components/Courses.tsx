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
    <div className="relative space-y-10">
      <div className="hero-glow" />

      {/* Hero header */}
      <header className="space-y-3 anim-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[var(--muted-foreground)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          New courses every month
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)]">
          Level up your <span className="gradient-text">trading edge</span>
        </h1>
        <p className="text-base text-[var(--muted-foreground)] max-w-xl">
          Buy individual courses to unlock lifetime access. Learn at your pace, from your dashboard.
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 backdrop-blur p-16 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 flex items-center justify-center">
            <GraduationCap size={28} className="text-teal-400" />
          </div>
          <p className="text-[var(--foreground)] font-medium">No courses yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Check back soon — new content drops monthly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c: any, idx: number) => {
            const owned = purchasedIds.has(c.id);
            return (
              <article
                key={c.id}
                style={{ animationDelay: `${idx * 60}ms` }}
                className="group relative flex flex-col overflow-hidden rounded-3xl glass card-lift anim-fade-up cursor-pointer"
                onClick={() => { setSelectedCourseId(c.id); setView('detail'); }}
              >
                {/* Cover */}
                <div className="relative h-44 overflow-hidden">
                  {c.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImage}
                      alt={c.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-500/30 via-teal-600/20 to-emerald-500/10 flex items-center justify-center">
                      <GraduationCap size={56} className="text-white/40" />
                    </div>
                  )}
                  {/* Gradient overlay for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

                  {/* Owned badge */}
                  {owned && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-wide shadow-lg">
                      <Check size={11} strokeWidth={3} /> Owned
                    </div>
                  )}

                  {/* Floating price chip */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-xs font-semibold">
                    <span>${c.priceUsd}</span>
                    <span className="text-white/60">·</span>
                    <span className="text-white/80">₱{c.pricePhp}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col p-5 gap-2">
                  <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight leading-snug line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>

                  {/* CTA row */}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      Lifetime access
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-teal-400 group-hover:gap-2 transition-all">
                      {owned ? 'Continue' : 'View course'}
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>

                {/* Hover sheen */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-tr from-teal-500/0 via-teal-500/0 to-emerald-500/0 group-hover:from-teal-500/[0.05] group-hover:via-teal-500/[0.03] group-hover:to-emerald-500/[0.05] transition-all duration-500" />
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
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft size={16} /> Back to Courses
        </button>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {course.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.coverImage} alt={course.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{course.title}</h1>
            <p className="text-[var(--muted-foreground)] whitespace-pre-wrap">{course.description}</p>

            {course.gallery && course.gallery.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {course.gallery.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg border border-[var(--border)]" />
                ))}
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Lock size={14} /> Buy this course to unlock {modules.length} modules / {structure.lessons.length} lessons
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onBuy('stripe')}
                  className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90"
                >
                  Pay ${course.priceUsd} with Card (Stripe)
                </button>
                <button
                  onClick={() => onBuy('paymongo')}
                  className="px-5 py-2.5 border border-[var(--border)] text-[var(--foreground)] rounded-xl font-medium hover:bg-[var(--muted)]"
                >
                  Pay ₱{course.pricePhp} with GCash/Card (PayMongo)
                </button>
              </div>
              {course.externalUrl && (
                <a
                  href={course.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                >
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
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to Courses
      </button>

      <h1 className="text-2xl font-bold text-[var(--foreground)]">{course.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar: modules + lessons */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {modules.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] p-2">No modules yet.</p>
          ) : modules.map((m: any) => (
            <div key={m.id}>
              <div className="text-xs font-semibold uppercase text-[var(--muted-foreground)] px-2 mb-1">
                {m.title}
              </div>
              <div className="space-y-0.5">
                {lessonsByModule(m.id).map((l: any) => {
                  const done = completedSet.has(l.id);
                  const active = activeLessonId === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActiveLessonId(l.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left ${
                        active ? 'bg-[var(--accent)]/15 text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      {done ? <Check size={14} className="text-emerald-500" /> :
                        l.contentType === 'video' ? <PlayCircle size={14} /> :
                        l.contentType === 'link' ? <LinkIcon size={14} /> : <FileText size={14} />}
                      <span className="flex-1 truncate">{l.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Lesson content */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 min-h-[400px]">
          {!activeLesson ? (
            <p className="text-[var(--muted-foreground)] text-sm">Select a lesson to begin.</p>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--foreground)]">{activeLesson.title}</h2>

              {activeLesson.contentType === 'video' && activeLesson.videoUrl && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden">
                  {/youtube\.com|youtu\.be|vimeo\.com/.test(activeLesson.videoUrl) ? (
                    <iframe
                      src={activeLesson.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={activeLesson.videoUrl} controls className="w-full h-full" />
                  )}
                </div>
              )}

              {activeLesson.contentType === 'link' && activeLesson.externalUrl && (
                <a
                  href={activeLesson.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl"
                >
                  Open external resource <ExternalLink size={14} />
                </a>
              )}

              {activeLesson.body && (
                <div className="prose prose-sm max-w-none text-[var(--foreground)] whitespace-pre-wrap">
                  {activeLesson.body}
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border)]">
                {completedSet.has(activeLesson.id) ? (
                  <button
                    onClick={() => unmarkComplete({ lessonId: activeLesson.id })}
                    className="px-4 py-2 border border-[var(--border)] rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Mark as incomplete
                  </button>
                ) : (
                  <button
                    onClick={() => markComplete({ lessonId: activeLesson.id, courseId })}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium"
                  >
                    Mark as complete
                  </button>
                )}
              </div>
            </div>
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
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft size={16} /> Back to Catalog
          </button>
        ) : <span />}
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium"
        >
          <Plus size={16} /> New Course
        </button>
      </div>

      <h1 className="text-2xl font-bold text-[var(--foreground)]">Manage Courses</h1>

      <div className="space-y-2">
        {courses.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--foreground)] truncate">{c.title}</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                ${c.priceUsd} · ₱{c.pricePhp} · {c.isPublished ? 'Published' : 'Draft'}
              </div>
            </div>
            <button
              onClick={() => updateCourse({ id: c.id, isPublished: !c.isPublished })}
              className="text-xs px-3 py-1 rounded-lg border border-[var(--border)]"
            >
              {c.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={() => setEditingId(c.id)}
              className="p-2 rounded-lg hover:bg-[var(--muted)]"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
                await deleteCourse({ id: c.id });
                showToast('Course deleted', 'success');
              }}
              className="p-2 rounded-lg hover:bg-[var(--red)]/10 text-[var(--red)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {courses.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No courses yet.</p>
        )}
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[var(--foreground)]">New Course</h2>

        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Slug" value={slug} onChange={setSlug} placeholder="my-course-slug" />
        <Field label="Description" value={description} onChange={setDescription} multiline />
        <FileUpload label="Cover image" value={coverImage} onChange={setCoverImage} accept="image/*" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price USD" value={priceUsd} onChange={setPriceUsd} type="number" />
          <Field label="Price PHP" value={pricePhp} onChange={setPricePhp} type="number" />
        </div>
        <Field label="External URL (optional)" value={externalUrl} onChange={setExternalUrl} />
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          Publish immediately
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm">Cancel</button>
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
            className="flex-1 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
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
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to Manage
      </button>

      <h1 className="text-2xl font-bold text-[var(--foreground)]">Edit: {course.title}</h1>

      {/* Course meta */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
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
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium"
        >
          Save course details
        </button>
      </div>

      {/* Modules */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Modules</h2>

        <div className="flex gap-2">
          <input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="New module title"
            className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
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
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Add Module
          </button>
        </div>

        {modules.map((m: any) => {
          const moduleLessons = lessons.filter((l: any) => l.moduleId === m.id);
          return (
            <div key={m.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  defaultValue={m.title}
                  onBlur={(e) => {
                    if (e.target.value !== m.title) updateModule({ id: m.id, title: e.target.value });
                  }}
                  className="flex-1 bg-transparent font-semibold text-[var(--foreground)] focus:outline-none"
                />
                <button
                  onClick={async () => {
                    if (!confirm(`Delete module "${m.title}" and its lessons?`)) return;
                    await deleteModule({ id: m.id });
                  }}
                  className="p-2 rounded-lg text-[var(--red)] hover:bg-[var(--red)]/10"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-1 pl-4">
                {moduleLessons.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-2 text-sm">
                    <FileText size={12} className="text-[var(--muted-foreground)]" />
                    <span className="flex-1 text-[var(--foreground)]">{l.title}</span>
                    <button onClick={() => setEditingLessonId(l.id)} className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><Edit2 size={12} /></button>
                    <button onClick={() => deleteLesson({ id: l.id })} className="p-1 text-[var(--red)]"><Trash2 size={12} /></button>
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
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Edit Lesson</h2>

        <Field label="Title" value={title} onChange={setTitle} />

        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Content type</div>
          <div className="flex gap-2">
            {(['text', 'video', 'link'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setContentType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm ${contentType === t ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {contentType === 'video' && <FileUpload label="Video file (or paste embed URL)" value={videoUrl} onChange={setVideoUrl} accept="video/*" />}
        {contentType === 'link' && <Field label="External URL" value={externalUrl} onChange={setExternalUrl} />}

        <Field label="Body / notes" value={body} onChange={setBody} multiline />

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-sm">Cancel</button>
          <button
            onClick={() => onSave({ title, contentType, body, videoUrl: videoUrl || undefined, externalUrl: externalUrl || undefined })}
            className="flex-1 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
