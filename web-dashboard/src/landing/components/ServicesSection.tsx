import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { serviceCards } from '../data/content';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

function MagneticTag({ children, bg }: { children: string; bg: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
    gsap.to(el, { x, y, duration: 0.2 });
  };

  const onLeave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.7 });

  return (
    <span
      ref={ref}
      className="sh-service-tag"
      style={{ background: bg }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </span>
  );
}

export default function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      gsap.fromTo(
        '.sh-services .sh-line-inner',
        { y: '4rem', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          scrollTrigger: { trigger: '.sh-services__intro', start: '-10% bottom', end: '60% center', scrub: 1 },
        },
      );

      serviceCards.forEach((card) => {
        gsap.to(`#${card.id} .sh-service-icon`, {
          rotate: 360,
          duration: 4,
          ease: 'none',
          repeat: -1,
        });
      });

      if (reduced || window.innerWidth < 1024) {
        serviceCards.forEach((card) => {
          gsap.fromTo(
            `#${card.id}`,
            { y: '15%', scale: 0.95 },
            {
              y: 0,
              scale: 1,
              scrollTrigger: { trigger: `#${card.id}`, start: 'top 85%', end: 'center center', scrub: 1 },
            },
          );
        });
        return;
      }

      gsap.fromTo(
        '#serviceItem0',
        { scale: 1.05 },
        { scale: 1, scrollTrigger: { trigger: '#serviceItem0', start: 'top 110%', end: 'center center', scrub: 0 } },
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#serviceItem0',
          start: 'center center',
          end: '+=250%',
          scrub: 0,
          pin: '.sh-service-stack',
          pinSpacing: true,
          anticipatePin: 0,
        },
      });

      tl.addLabel('start')
        .to('#serviceItem0', { y: -60, scale: 0.95, ease: 'none' }, 'start')
        .to('#serviceItem1', { y: 0, scale: 1, ease: 'none' }, 'start')
        .addLabel('second')
        .to('#serviceItem0', { y: -120, scale: 0.9, ease: 'none' }, 'second')
        .to('#serviceItem1', { y: -60, scale: 0.95, ease: 'none' }, 'second')
        .to('#serviceItem2', { y: 0, scale: 1, ease: 'none' }, 'second')
        .addLabel('third')
        .to('#serviceItem0', { y: -180, scale: 0.85, ease: 'none' }, 'third')
        .to('#serviceItem1', { y: -120, scale: 0.9, ease: 'none' }, 'third')
        .to('#serviceItem2', { y: -60, scale: 0.95, ease: 'none' }, 'third')
        .to('#serviceItem3', { y: 0, scale: 1, ease: 'none' }, 'third');
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <section ref={sectionRef} id="services" className="sh-services">
      <div className="sh-container">
        <div className="sh-services__intro">
          <p className="sh-section-label sh-line-mask">
            <span className="sh-line-inner">Capabilities</span>
          </p>
          <h2 className="sh-section-headline">
            <span className="sh-line-mask"><span className="sh-line-inner">A unified stack</span></span>
            <span className="sh-line-mask">
              <span className="sh-line-inner">
                for <span className="sh-hword">any</span> emergency.
              </span>
            </span>
          </h2>
        </div>

        <div className="sh-service-stack">
          {serviceCards.map((card) => (
            <article
              key={card.id}
              id={card.id}
              className="sh-service-card"
              style={{ background: card.bg }}
            >
              <div className="sh-service-card__head">
                <h3 className="sh-service-card__title">
                  <span className="sh-service-card__line1">{card.line1}</span>
                  <span className="sh-service-card__line2">{card.line2}</span>
                </h3>
              </div>
              <div className="sh-service-card__tags">
                {card.tags.map((tag) => (
                  <MagneticTag key={tag} bg={card.tagBg}>{tag}</MagneticTag>
                ))}
              </div>
              <div className="sh-service-card__foot">
                <span className="sh-service-icon">✳</span>
                <p className="sh-service-card__desc">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
