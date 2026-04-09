'use client';

import { useState } from 'react';
import { X, Eye, FileText, ZoomIn, Download } from 'lucide-react';

interface DocPreviewProps {
  url: string;
  label: string;
}

/**
 * Renders a document thumbnail with click-to-lightbox preview.
 * Supports images (jpg/png/webp) and PDFs.
 */
export function DocPreview({ url, label }: DocPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url) || url.includes('image');
  const isPdf = /\.pdf$/i.test(url) || url.includes('pdf');

  return (
    <>
      {/* Thumbnail */}
      <div
        onClick={() => setLightboxOpen(true)}
        className="group relative cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:border-indigo-300 transition-all duration-200"
      >
        {isImage ? (
          <div className="relative aspect-[4/3] w-full">
            <img
              src={url}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden flex-col items-center justify-center absolute inset-0 bg-slate-100 text-slate-400">
              <FileText className="w-8 h-8 mb-1" />
              <span className="text-[10px]">Preview unavailable</span>
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] w-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
            <FileText className="w-10 h-10 mb-2" />
            <span className="text-xs font-medium">{isPdf ? 'PDF Document' : 'File'}</span>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-xs font-semibold text-slate-700">
            <ZoomIn className="w-3.5 h-3.5" />
            Preview
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setLightboxOpen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Controls */}
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Open Original
              </a>
              <button
                onClick={() => setLightboxOpen(false)}
                className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Label */}
            <div className="absolute -top-12 left-0 text-white text-sm font-semibold">
              {label}
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              {isImage ? (
                <img
                  src={url}
                  alt={label}
                  className="w-full max-h-[85vh] object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={url}
                  className="w-full h-[85vh]"
                  title={label}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <FileText className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Cannot preview this file type</p>
                  <a href={url} target="_blank" rel="noreferrer" className="mt-4 btn-primary text-sm">
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Compact inline preview link with icon
 */
export function DocPreviewLink({ url, label }: DocPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url) || url.includes('image');
  const isPdf = /\.pdf$/i.test(url) || url.includes('pdf');

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium w-full"
      >
        <Eye className="w-3 h-3" />
        View {label}
      </button>

      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setLightboxOpen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a href={url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Open Original
              </a>
              <button onClick={() => setLightboxOpen(false)}
                className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="absolute -top-12 left-0 text-white text-sm font-semibold">{label}</div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              {isImage ? (
                <img src={url} alt={label} className="w-full max-h-[85vh] object-contain" />
              ) : isPdf ? (
                <iframe src={url} className="w-full h-[85vh]" title={label} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <FileText className="w-16 h-16 mb-4" />
                  <p>Cannot preview this file type</p>
                  <a href={url} target="_blank" rel="noreferrer" className="mt-4 btn-primary text-sm">
                    <Download className="w-4 h-4" /> Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
