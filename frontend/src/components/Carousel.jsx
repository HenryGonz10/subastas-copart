import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { photoSrc } from '../lib/api';

/** Carrusel con flechas, miniaturas, teclado, gesto táctil y vista a pantalla completa. */
export default function Carousel({ photos, alt }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchX = useRef(null);
  const thumbs = useRef(null);
  const count = photos.length;

  const go = useCallback((delta) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  if (count === 0) return <div className="aspect-[4/3] rounded-2xl bg-slate-100" />;

  const swipe = {
    onTouchStart: (e) => (touchX.current = e.touches[0].clientX),
    onTouchEnd: (e) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      touchX.current = null;
    },
  };

  const Arrow = ({ dir }) => (
    <button
      type="button"
      onClick={() => go(dir)}
      className={`absolute top-1/2 -translate-y-1/2 ${dir < 0 ? 'left-3' : 'right-3'} grid size-11 place-items-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:scale-105 hover:bg-white`}
      aria-label={dir < 0 ? 'Foto anterior' : 'Foto siguiente'}
    >
      {dir < 0 ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100" {...swipe}>
        {photos.map((p, i) => (
          <img
            key={p.id}
            src={photoSrc(p.url)}
            alt={`${alt} - foto ${i + 1}`}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        <Arrow dir={-1} />
        <Arrow dir={1} />
        <div className="absolute bottom-3 left-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-bold text-white">
          {index + 1} / {count}
        </div>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow hover:bg-white"
        >
          <Expand className="size-3.5" /> Ampliar
        </button>
      </div>

      <div ref={thumbs} className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
              i === index ? 'ring-brand-600' : 'opacity-70 ring-transparent hover:opacity-100'
            }`}
          >
            <img src={photoSrc(p.url)} alt="" className="size-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 p-4 backdrop-blur" {...swipe}>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            aria-label="Cerrar"
          >
            <X className="size-6" />
          </button>
          <div className="relative w-full max-w-6xl">
            <img src={photoSrc(photos[index].url)} alt={alt} className="max-h-[85vh] w-full rounded-2xl object-contain" />
            <Arrow dir={-1} />
            <Arrow dir={1} />
          </div>
          <p className="absolute bottom-6 text-sm font-semibold text-slate-600">{index + 1} / {count}</p>
        </div>
      )}
    </div>
  );
}
