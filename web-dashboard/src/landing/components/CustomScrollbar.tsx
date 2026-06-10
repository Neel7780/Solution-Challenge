import { useEffect, useRef } from 'react';
import type Lenis from 'lenis';

interface Props {
  lenisRef: React.RefObject<Lenis | null>;
}

export default function CustomScrollbar({ lenisRef }: Props) {
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const thumb = thumbRef.current;
    const lenis = lenisRef.current;
    if (!thumb || !lenis) return;

    const update = () => {
      if (dragging.current) return;
      const limit = lenis.limit;
      const scroll = lenis.scroll;
      const trackH = trackRef.current?.clientHeight ?? window.innerHeight;
      const thumbH = Math.max(40, (window.innerHeight / (limit + window.innerHeight)) * trackH);
      const y = limit > 0 ? (scroll / limit) * (trackH - thumbH) : 0;
      thumb.style.height = `${thumbH}px`;
      thumb.style.transform = `translateY(${y}px)`;
    };

    lenis.on('scroll', update);
    window.addEventListener('resize', update);
    update();

    const onPointerDown = (e: PointerEvent) => {
      dragging.current = true;
      document.documentElement.classList.add('sh-scrollbar-grabbing');
      thumb.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current || !trackRef.current) return;
      const track = trackRef.current.getBoundingClientRect();
      const ratio = (e.clientY - track.top) / track.height;
      const limit = lenis.limit;
      lenis.scrollTo(ratio * limit, { immediate: false, lerp: 0.2 });
    };

    const onPointerUp = () => {
      dragging.current = false;
      document.documentElement.classList.remove('sh-scrollbar-grabbing');
    };

    thumb.addEventListener('pointerdown', onPointerDown);
    thumb.addEventListener('pointermove', onPointerMove);
    thumb.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('resize', update);
      thumb.removeEventListener('pointerdown', onPointerDown);
      thumb.removeEventListener('pointermove', onPointerMove);
      thumb.removeEventListener('pointerup', onPointerUp);
    };
  }, [lenisRef]);

  return (
    <div ref={trackRef} className="sh-scrollbar" aria-hidden="true">
      <div ref={thumbRef} className="sh-scrollbar__thumb" />
    </div>
  );
}
