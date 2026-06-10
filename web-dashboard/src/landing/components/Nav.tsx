import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { navLinks } from '../data/content';
import PillButton from './PillButton';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  onRequestDemo: () => void;
}

export default function Nav({ onRequestDemo }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.to('.sh-header__logo', {
        scrollTrigger: {
          trigger: 'main',
          start: 'top top',
          end: '5% top',
          toggleActions: 'none play reverse none',
        },
        y: '-250%',
        duration: 0.4,
        ease: 'power2.in',
      });
    },
    { scope: headerRef },
  );

  useGSAP(
    () => {
      if (menuOpen) {
        gsap.to(menuRef.current, { x: 0, rotate: 0, duration: 1, ease: 'elastic.out(1.1, 1)' });
      } else {
        gsap.to(menuRef.current, { x: '120%', rotate: 8, duration: 1, ease: 'elastic.out(1, 1)' });
      }
    },
    { dependencies: [menuOpen] },
  );

  return (
    <header ref={headerRef} className="sh-header sh-header-reveal">
      <a href="/" className="sh-header__logo" aria-label="CrisisRespond home">
        <svg viewBox="0 0 180 32" width="180" height="32" aria-hidden="true">
          <text x="0" y="24" fill="currentColor" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="22" letterSpacing="-1.5">
            CRISIS
          </text>
          <text x="72" y="24" fill="#27B7A5" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="22" letterSpacing="-1.5">
            RESPOND
          </text>
        </svg>
      </a>

      <div className="sh-header__actions">
        <PillButton
          label="Request Demo"
          variant="light"
          onClick={onRequestDemo}
          icon={<span>→</span>}
        />
        <PillButton
          label={menuOpen ? 'close' : 'Menu'}
          variant="dark"
          onClick={() => setMenuOpen((v) => !v)}
          icon={<span>☰</span>}
        />
      </div>

      <nav ref={menuRef} className="sh-menu" aria-hidden={!menuOpen}>
        <div className="sh-menu__panel">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="sh-menu__link" onClick={() => setMenuOpen(false)}>
              {link.label}
              <span className="sh-menu__arrow">→</span>
            </a>
          ))}
          <button type="button" className="sh-menu__link" onClick={() => { setMenuOpen(false); navigate('/login'); }}>
            Sign In
            <span className="sh-menu__arrow">→</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
