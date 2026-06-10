import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PillButton from './PillButton';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  onRequestDemo: () => void;
}

export default function Footer({ onRequestDemo }: Props) {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.to('.sh-footer__rotate', {
        rotate: '+=360',
        duration: 10,
        ease: 'none',
        repeat: -1,
      });

      gsap.fromTo(
        '.sh-footer-letter',
        { y: '100%' },
        {
          y: '0%',
          stagger: 0.1,
          scrollTrigger: { trigger: '.sh-footer__logo', start: 'top bottom', end: 'bottom 65%', scrub: 1 },
        },
      );

      gsap.fromTo(
        '.sh-footer__extension',
        { y: '-100%' },
        {
          y: 0,
          scrollTrigger: { trigger: '.sh-footer__main', start: 'bottom 95%', end: 'bottom 80%', scrub: 1 },
        },
      );
    },
    { scope: footerRef },
  );

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const letters = 'CRISISRESPOND'.split('');

  return (
    <footer ref={footerRef} className="sh-footer">
      <div className="sh-footer__logo" aria-hidden="true">
        <div className="sh-footer__letters">
          {letters.map((l, i) => (
            <span key={i} className="sh-footer-letter-wrap">
              <span className="sh-footer-letter">{l}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="sh-footer__render sh-float-anim" aria-hidden="true">
        <svg viewBox="0 0 600 200" className="sh-footer__render-svg">
          <rect x="50" y="60" width="500" height="120" rx="16" fill="#D9E0E3" />
          <rect x="80" y="90" width="120" height="60" rx="6" fill="#27B7A5" opacity="0.4" />
          <rect x="220" y="90" width="140" height="60" rx="6" fill="#4a7cff" opacity="0.3" />
          <rect x="380" y="90" width="140" height="60" rx="6" fill="#ff5a4a" opacity="0.25" />
        </svg>
      </div>

      <div className="sh-footer__main">
        <p className="sh-footer__copyright">© CrisisRespond</p>
        <p className="sh-footer__subtitle">GIS Emergency Operations Platform</p>
        <div className="sh-footer__social">
          <a href="#work" className="sh-footer__social-link">Platform</a>
          <span className="sh-footer__rotate">✳</span>
          <a href="#services" className="sh-footer__social-link">Capabilities</a>
          <span className="sh-footer__rotate">✳</span>
          <a href="#cta" className="sh-footer__social-link">Contact</a>
        </div>
      </div>

      <div className="sh-footer__extension">
        <div className="sh-footer__extension-left">
          <a href="#work" className="sh-footer__ext-link">PLATFORM</a>
          <a href="#services" className="sh-footer__ext-link">CAPABILITIES</a>
          <a href="#cta" className="sh-footer__ext-link">CONTACT</a>
        </div>
        <div className="sh-footer__extension-right">
          <PillButton label="Request Demo" variant="dark" onClick={onRequestDemo} icon={<span>→</span>} />
          <PillButton label="Go Up" variant="soft" onClick={scrollTop} icon={<span>↑</span>} iconDirection="up" />
        </div>
      </div>
    </footer>
  );
}
