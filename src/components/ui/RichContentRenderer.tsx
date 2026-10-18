'use client';

import React from 'react';

interface RichContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Safely renders rich markdown content including headers, blockquotes,
 * bullet lists, inline formatting and image figures with captions.
 */
export function RichContentRenderer({ content, className = '' }: RichContentRendererProps) {
  if (!content) return null;

  // Split into block paragraphs separated by double newlines or single newlines with block markers
  const rawBlocks = content.split(/\n\s*\n/);

  return (
    <div className={`space-y-6 font-serif leading-relaxed text-heritage-900 ${className}`}>
      {rawBlocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // 1. Check for standalone image: ![alt](url)
        const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imageMatch) {
          const altText = imageMatch[1];
          const imageUrl = imageMatch[2];

          return (
            <figure
              key={idx}
              className="my-8 rounded-2xl overflow-hidden border border-heritage-200 bg-heritage-100/40 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={altText || 'Photographie'}
                className="w-full max-h-[550px] object-cover"
                loading="lazy"
              />
              {altText && (
                <figcaption className="p-3 text-center text-xs text-heritage-600 bg-heritage-50/90 border-t border-heritage-200 italic">
                  {altText}
                </figcaption>
              )}
            </figure>
          );
        }

        // 2. Check for H2: ## Title
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="font-serif text-2xl sm:text-3xl font-bold text-heritage-950 pt-4 pb-1 border-b border-heritage-200"
            >
              {renderInline(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        // 3. Check for H3: ### Subtitle
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="font-serif text-xl sm:text-2xl font-bold text-heritage-900 pt-3"
            >
              {renderInline(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // 4. Check for Blockquote: > Quote text
        if (trimmed.startsWith('> ')) {
          const quoteLines = trimmed
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join(' ');

          return (
            <blockquote
              key={idx}
              className="border-l-4 border-heritage-400 pl-4 py-2 my-4 italic text-heritage-800 bg-heritage-100/50 rounded-r-xl"
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // 5. Check for bullet list: lines starting with "- " or "* "
        if (trimmed.split('\n').every((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '))) {
          const items = trimmed.split('\n').map((line) => line.trim().replace(/^[-*]\s+/, ''));
          return (
            <ul key={idx} className="list-disc list-inside space-y-1.5 pl-2 my-4 text-heritage-800">
              {items.map((item, i) => (
                <li key={i} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        // 6. Regular paragraph (can contain inline images or inline links)
        // Check if paragraph contains an embedded image anywhere
        if (trimmed.includes('![') && trimmed.includes('](')) {
          // Mixed paragraph: split by image tags
          const parts = trimmed.split(/(!\[.*?\]\(.*?\))/g);
          return (
            <div key={idx} className="space-y-4">
              {parts.map((part, pIdx) => {
                const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
                if (imgMatch) {
                  return (
                    <figure
                      key={pIdx}
                      className="my-6 rounded-2xl overflow-hidden border border-heritage-200 bg-heritage-100/40 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgMatch[2]}
                        alt={imgMatch[1] || 'Illustration'}
                        className="w-full max-h-[500px] object-cover"
                        loading="lazy"
                      />
                      {imgMatch[1] && (
                        <figcaption className="p-2.5 text-center text-xs text-heritage-600 bg-heritage-50/90 border-t border-heritage-200 italic">
                          {imgMatch[1]}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                if (!part.trim()) return null;
                return (
                  <p key={pIdx} className="leading-relaxed text-base sm:text-lg">
                    {renderInline(part)}
                  </p>
                );
              })}
            </div>
          );
        }

        // Standard text paragraph
        return (
          <p key={idx} className="leading-relaxed text-base sm:text-lg">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Handles bold (**text**), italic (*text*), and links ([title](url))
 */
function renderInline(text: string): React.ReactNode {
  // Regex to split by links [text](url) and bold **text**
  const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // 1. Link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-heritage-800 font-semibold underline hover:text-heritage-950 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // 2. Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-heritage-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // 3. Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Plain text
    return part;
  });
}
