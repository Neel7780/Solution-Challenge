import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface Props {
  onComplete: () => void;
}

export default function PageLoader({ onComplete }: Props) {
  const loaderRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        setDone(true);
        onComplete();
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setDone(true);
          onComplete();
        },
      });

      tl.fromTo(
        '.sh-loader__logo',
        { opacity: 0, scale: 0.75, rotate: 120 },
        { opacity: 1, scale: 1, rotate: 0, duration: 1.6, ease: 'elastic.out(1.2, 1)', delay: 0.1 },
      )
        .to('.sh-loader__logo-wrap', { width: '500vw', duration: 0.5, ease: 'power2.in' }, 'zoom')
        .to('.sh-loader__logo', { scale: 40, duration: 0.5, ease: 'power2.in' }, 'zoom')
        .to('.sh-loader', { opacity: 0, pointerEvents: 'none', duration: 0.3 }, 'end');
    },
    { scope: loaderRef },
  );

  useEffect(() => {
    document.body.style.overflow = done ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [done]);

  if (done) return null;

  return (
    <div ref={loaderRef} className="sh-loader">
      <div className="sh-loader__logo-wrap">
        <div className="sh-loader__logo">
          <svg viewBox="0 0 120 40" width="120" height="40" aria-hidden="true">
            <text x="0" y="30" fill="#F0F6F8" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="28" letterSpacing="-1">
              CR
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
