'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-[10vh] px-0 sm:px-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`${sizeClasses[size]} w-full bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col animate-in`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border)]">
          <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
