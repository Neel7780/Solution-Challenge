import { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from './hooks/useLenis';
import { useReducedMotion } from './hooks/useReducedMotion';
import PageLoader from './components/PageLoader';
import CustomScrollbar from './components/CustomScrollbar';
import Nav from './components/Nav';
import Hero from './components/Hero';
import WorkSection from './components/WorkSection';
import ServicesSection from './components/ServicesSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import OnboardingDialog from './components/OnboardingDialog';
import './landing.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [openRequest, setOpenRequest] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduced = useReducedMotion();
  const lenisRef = useLenis(!reduced);

  useEffect(() => {
    if (reduced) setLoaded(true);
    document.body.style.background = '#F0F6F8';
    document.body.style.backgroundImage = 'none';
    return () => {
      document.body.style.background = '';
      document.body.style.backgroundImage = '';
    };
  }, [reduced]);

  useGSAP(
    () => {
      ScrollTrigger.refresh();
      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    },
    { scope: pageRef },
  );

  useGSAP(
    () => {
      if (!loaded || reduced) {
        if (reduced) gsap.set('.sh-header-reveal', { opacity: 1, scale: 1 });
        return;
      }
      gsap.fromTo(
        '.sh-header-reveal',
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'elastic.out(1.1, 1)' }
      );
    },
    { scope: pageRef, dependencies: [loaded, reduced] }
  );

  return (
    <div ref={pageRef} className="sh-page">
      {!loaded && !reduced && <PageLoader onComplete={() => setLoaded(true)} />}
      {!reduced && <CustomScrollbar lenisRef={lenisRef} />}
      <Nav onRequestDemo={() => setOpenRequest(true)} />
      <main id="main-content">
        <Hero loaded={loaded || reduced} />
        <WorkSection />
        <ServicesSection />
        <CTASection onRequestDemo={() => setOpenRequest(true)} />
      </main>
      <Footer onRequestDemo={() => setOpenRequest(true)} />
      <OnboardingDialog open={openRequest} onClose={() => setOpenRequest(false)} />
    </div>
  );
}
