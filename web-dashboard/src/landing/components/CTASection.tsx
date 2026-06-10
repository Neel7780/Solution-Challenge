import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PillButton from './PillButton';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  onRequestDemo: () => void;
}

export default function CTASection({ onRequestDemo }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useGSAP(
    () => {
      gsap.fromTo(
        '.sh-cta-anim',
        { y: '3rem', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          scrollTrigger: { trigger: '.sh-cta', start: '25% 80%', end: '50% center', scrub: 1 },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="cta" className="sh-cta">
      <div className="sh-cta__visual sh-cta-anim" aria-hidden="true">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop" 
          alt="Abstract 3D Shape" 
          className="sh-cta__image" 
        />
      </div>

      <div className="sh-cta__content">
        <h2 className="sh-cta__headline sh-cta-anim">
          <span className="sh-line-mask"><span className="sh-line-inner">Don't</span></span>
          <span className="sh-line-mask"><span className="sh-line-inner">be shy</span></span>
        </h2>
        <div className="sh-cta__actions sh-cta-anim">
          <PillButton label="Request Demo" variant="dark" onClick={onRequestDemo} icon={<span>→</span>} />
          <PillButton label="Launch Dashboard" variant="light" onClick={() => navigate('/login')} icon={<span>→</span>} />
        </div>
      </div>
    </section>
  );
}
