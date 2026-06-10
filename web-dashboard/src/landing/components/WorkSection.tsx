import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { workProjects } from '../data/content';

gsap.registerPlugin(ScrollTrigger);

export default function WorkSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        '.sh-work .sh-line-inner',
        { y: '4rem', opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          scrollTrigger: { trigger: '.sh-work__intro', start: '-10% bottom', end: '60% center', scrub: 1 },
        },
      );

      ScrollTrigger.batch('.sh-project-card', {
        onEnter: (els) =>
          gsap.from(els, { y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', overwrite: true }),
        start: 'top 90%',
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="work" className="sh-work">
      <div className="sh-container">
        <div className="sh-work__intro">
          <p className="sh-section-label sh-line-mask">
            <span className="sh-line-inner">Platform</span>
          </p>
          <h2 className="sh-section-headline">
            <span className="sh-line-mask"><span className="sh-line-inner">We synchronize</span></span>
            <span className="sh-line-mask">
              <span className="sh-line-inner">
                crisis <span className="sh-hword">response</span> in real time.
              </span>
            </span>
          </h2>
        </div>

        <div className="sh-projects-grid">
          {workProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: (typeof workProjects)[number] }) {
  const cardRef = useRef<HTMLElement>(null);

  return (
    <article
      ref={cardRef}
      className="sh-project-card"
      style={{ background: project.gradient }}
    >
      <div className="sh-project-card__pattern" style={{ borderColor: project.accent }} />
      {/* @ts-ignore */}
      {project.image && <img src={project.image} alt={project.title} className="sh-project-card__image" />}
      <div className="sh-project-card__overlay" />
      <div className="sh-project-card__title-wrap">
        <h3 className="sh-project-card__title">
          {project.title}
        </h3>
        <span className="sh-project-card__arrow">→</span>
      </div>
    </article>
  );
}
