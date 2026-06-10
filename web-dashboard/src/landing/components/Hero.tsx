import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroTagline } from '../data/content';

gsap.registerPlugin(ScrollTrigger);

export default function Hero({ loaded = true }: { loaded?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!loaded) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        gsap.set('.sh-line-inner', { y: 0 });
        gsap.set('.sh-hero-reveal', { opacity: 1, scale: 1 });
        return;
      }

      const tl = gsap.timeline();
      
      tl.fromTo(
        '.sh-hero-reveal',
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'elastic.out(1.1, 1)', stagger: 0.08 }
      );

      tl.fromTo(
        '.sh-hero .sh-line-inner',
        { y: '110%' },
        { y: 0, duration: 1.2, ease: 'elastic.out(1.1, 1)', stagger: 0.08 },
        "-=0.8"
      );

      gsap.to('.sh-hero__scroll', {
        scrollTrigger: { trigger: '.sh-hero__scroll', start: 'bottom 80%', end: 'bottom 20%', scrub: 1 },
        opacity: 0,
      });
    },
    { scope: sectionRef, dependencies: [loaded] },
  );

  const lines = heroTagline.split('\n');

  return (
    <section ref={sectionRef} className="sh-hero">
      {/* Hero rendering svg removed for clean intro page */}

      <p className="sh-hero__scroll sh-hero-reveal">Scroll</p>

      <div className="sh-hero__bottom sh-hero-reveal">
        <div className="sh-hero__wordmark" aria-hidden="true">
          <svg viewBox="0 0 900 120" className="sh-hero__wordmark-svg">
            <text x="0" y="95" fill="#0C1016" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="110" letterSpacing="-6">
              CRISISRESPOND
            </text>
          </svg>
        </div>
        <div className="sh-hero__content-row">
          <h1 className="sh-hero__tagline">
            {lines.map((line) => (
              <span key={line} className="sh-line-mask">
                <span className="sh-line-inner">{line}</span>
              </span>
            ))}
          </h1>
          <div className="sh-hero__intro-text">
            <p>The GIS-powered emergency operations platform for enterprise properties.</p>
            <p>Synchronize live response across EOCs, security personnel, and guests.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
