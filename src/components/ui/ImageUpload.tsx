'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon, ExternalLink, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: 'articles' | 'sources' | 'persons' | 'general';
  label?: string;
  helperText?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = 'general',
  label = 'Illustration ou document numérisé',
  helperText = 'Formats acceptés : JPG, PNG, WebP, AVIF ou PDF (max. 10 Mo).',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (limite maximale : 10 Mo).');
      return;
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Format de fichier non pris en charge. Veuillez choisir une image ou un PDF.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Erreur lors du téléversement du fichier.');
      }

      onChange(json.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du téléversement.';
      setError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleRemove() {
    onChange(null);
    setError(null);
  }

  const isPdf = value?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-heritage-700">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative rounded-xl border border-heritage-200 overflow-hidden bg-heritage-100/40 p-3 group flex items-center space-x-4">
          {isPdf ? (
            <div className="w-16 h-16 rounded-lg bg-red-100 text-red-700 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider">PDF</span>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-heritage-200 shrink-0 border border-heritage-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Aperçu du média"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-heritage-900 truncate">
              {value.split('/').pop()}
            </p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[11px] text-heritage-600 hover:text-heritage-950 underline mt-0.5"
            >
              <span>Ouvrir l&apos;original en plein écran</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1.5 rounded-lg border border-heritage-300 bg-white text-heritage-700 hover:bg-heritage-50 text-xs font-medium transition-colors"
            >
              Remplacer
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              title="Supprimer le document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isUploading
              ? 'border-heritage-400 bg-heritage-100/50 cursor-not-allowed'
              : 'border-heritage-300 hover:border-heritage-500 bg-heritage-50/50 hover:bg-heritage-100/30'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <Loader2 className="w-8 h-8 text-heritage-600 animate-spin" />
              <span className="text-xs font-medium text-heritage-800">
                Téléversement et optimisation en cours...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 py-1">
              <div className="w-10 h-10 rounded-full bg-heritage-200/80 text-heritage-700 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs text-heritage-800 font-medium">
                <span className="underline font-semibold">Cliquez pour choisir un document</span> ou glissez-le ici
              </div>
              <p className="text-[11px] text-heritage-500">{helperText}</p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-xs text-red-600 flex items-center space-x-1.5 pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
