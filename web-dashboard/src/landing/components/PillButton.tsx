import React, { useRef } from 'react';
import gsap from 'gsap';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'dark' | 'light' | 'soft';
  icon?: React.ReactNode;
  iconDirection?: 'right' | 'up';
  href?: string;
}

export default function PillButton({
  label,
  variant = 'dark',
  icon,
  iconDirection = 'right',
  href,
  className = '',
  onClick,
  ...rest
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(btn, { x: x * 6, y: y * 4, duration: 0.3, ease: 'power2.out' });
  };

  const onLeave = () => {
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
  };

  const inner = (
    <>
      <span className="sh-pill__label">{label}</span>
      {icon && (
        <span className={`sh-pill__icon sh-pill__icon--${iconDirection}`}>
          <span className="sh-pill__icon-inner">{icon}</span>
          <span className="sh-pill__icon-hover">{icon}</span>
        </span>
      )}
    </>
  );

  const cls = `sh-pill sh-pill--${variant} ${className}`;

  if (href) {
    return (
      <a href={href} className={cls} onMouseMove={onMove} onMouseLeave={onLeave}>
        {inner}
      </a>
    );
  }

  return (
    <button ref={btnRef} type="button" className={cls} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick} {...rest}>
      {inner}
    </button>
  );
}
