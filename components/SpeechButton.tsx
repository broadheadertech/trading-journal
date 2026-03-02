'use client';

import { Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface SpeechButtonProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SpeechButton({ value, onChange, className = '' }: SpeechButtonProps) {
  const { isListening, isSupported, toggle } = useSpeechToText({
    onResult: (transcript) => {
      const separator = value.trim() ? ' ' : '';
      onChange(value + separator + transcript);
    },
  });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isListening ? 'Stop recording' : 'Speak to fill this field'}
      className={`flex-shrink-0 p-1.5 rounded-md transition-colors ${
        isListening
          ? 'bg-red-500/20 text-red-400 animate-pulse'
          : 'text-(--muted) hover:text-(--foreground) hover:bg-(--surface-2)'
      } ${className}`}
    >
      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  );
}
