import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SLIDES } from './slides';
import './talk.css';

/**
 * The talk deck, at #/talk. Arrow keys or clicks move between slides; `?s=N` opens slide N;
 * `?all` stacks every slide at full size, for review and the overflow check.
 */
export function TalkDeck() {
  const [params, setParams] = useSearchParams();
  const all = params.has('all');
  const outline = params.has('outline');
  const [index, setIndex] = useState(() => Math.max(0, Math.min(SLIDES.length - 1, Number(params.get('s') ?? 1) - 1)));
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const go = useCallback((next: number) => {
    const i = Math.max(0, Math.min(SLIDES.length - 1, next));
    setIndex(i);
    setParams({ s: String(i + 1) }, { replace: true });
  }, [setParams]);

  useEffect(() => {
    if (all) return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(index + 1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(index - 1); }
      if (e.key === 'Home') go(0);
      if (e.key === 'End') go(SLIDES.length - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [all, go, index]);

  const shown = all ? SLIDES : [SLIDES[index]];
  return (
    <div className={`talk${all ? ' is-all' : ''}${outline ? ' is-outline' : ''}`} style={{ ['--talk-scale' as string]: scale }}>
      {shown.map((slide) => (
        <section key={slide.id} className={`talk-slide${slide.kind ? ` is-${slide.kind}` : ''}`} data-slide={slide.id}>
          {slide.render()}
        </section>
      ))}
    </div>
  );
}
