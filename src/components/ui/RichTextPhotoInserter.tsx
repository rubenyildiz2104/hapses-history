'use client';

import { useState } from 'react';
import { ImageUpload } from './ImageUpload';
import { ImagePlus, Check, X, Copy } from 'lucide-react';

interface RichTextPhotoInserterProps {
  onInsertMarkdown: (markdownText: string) => void;
  folder?: 'articles' | 'sources' | 'general';
}

export function RichTextPhotoInserter({
  onInsertMarkdown,
  folder = 'articles',
}: RichTextPhotoInserterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [insertedList, setInsertedList] = useState<Array<{ url: string; caption: string }>>([]);

  function handleInsert() {
    if (!uploadedUrl) return;

    const trimmedCaption = caption.trim() || 'Photographie d\'archive';
    const markdown = `\n\n![${trimmedCaption}](${uploadedUrl})\n\n`;
    
    onInsertMarkdown(markdown);
    setInsertedList((prev) => [...prev, { url: uploadedUrl, caption: trimmedCaption }]);

    // Reset current uploader
    setUploadedUrl(null);
    setCaption('');
    setIsOpen(false);
  }

  function handleReInsert(item: { url: string; caption: string }) {
    const markdown = `\n\n![${item.caption}](${item.url})\n\n`;
    onInsertMarkdown(markdown);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-heritage-300 bg-heritage-50 text-heritage-800 text-xs font-semibold hover:bg-heritage-100 hover:border-heritage-400 transition-colors shadow-sm"
        >
          <ImagePlus className="w-3.5 h-3.5 text-heritage-700" />
          <span>{isOpen ? 'Fermer l\'insertion d\'image' : 'Insérer une photo dans le texte'}</span>
        </button>

        {insertedList.length > 0 && (
          <span className="text-[11px] text-heritage-600">
            {insertedList.length} photo(s) insérée(s)
          </span>
        )}
      </div>

      {isOpen && (
        <div className="p-4 rounded-xl border-2 border-heritage-300 bg-white space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-heritage-100">
            <h4 className="font-serif font-bold text-xs text-heritage-950 uppercase tracking-wider">
              Téléverser et insérer une photo à l&apos;endroit souhaité
            </h4>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-heritage-400 hover:text-heritage-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ImageUpload
            value={uploadedUrl}
            onChange={(url) => setUploadedUrl(url)}
            folder={folder}
            label="1. Choisissez ou déposez votre photo"
            helperText="Photo d'archive, vue du village, monument ou plan (JPG, PNG, WebP max 10 Mo)."
          />

          {uploadedUrl && (
            <div className="space-y-3 pt-2 border-t border-heritage-100">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-heritage-700 mb-1">
                  2. Légende de la photo (affichée sous l&apos;image)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ex : L'église Mor Hadbshabo vue du sud, vers 1910"
                  className="w-full px-3 py-1.5 rounded-lg border border-heritage-300 text-xs focus:outline-none focus:ring-2 focus:ring-heritage-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadedUrl(null);
                    setCaption('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-heritage-700 hover:bg-heritage-100"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleInsert}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-heritage-800 text-heritage-50 text-xs font-semibold hover:bg-heritage-900 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Insérer dans le texte</span>
                </button>
              </div>
            </div>
          )}

          {/* List of previously inserted photos */}
          {insertedList.length > 0 && (
            <div className="pt-3 border-t border-heritage-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-heritage-500 tracking-wider">
                Photos disponibles dans cet article :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {insertedList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-heritage-50 border border-heritage-200 text-xs"
                  >
                    <span className="truncate max-w-[180px] text-heritage-800 font-medium">
                      {item.caption}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReInsert(item)}
                      className="text-heritage-600 hover:text-heritage-950 font-semibold text-[11px] underline"
                      title="Réinsérer cette photo"
                    >
                      Réinsérer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
