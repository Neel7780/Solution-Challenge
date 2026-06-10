export const heroTagline = 'Eliminate the fog.\nSave every second.';

export const workProjects = [
  { title: 'Digital Twin', slug: 'digital-twin', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80', gradient: 'linear-gradient(135deg, #0C1016 0%, #1a3a4a 50%, #27B7A5 100%)', accent: '#27B7A5' },
  { title: 'Gemini AI', slug: 'gemini-ai', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80', gradient: 'linear-gradient(135deg, #0C1016 0%, #1e2a5e 50%, #4a7cff 100%)', accent: '#4a7cff' },
  { title: 'Staff Dispatch', slug: 'dispatch', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80', gradient: 'linear-gradient(135deg, #0C1016 0%, #3a1a1a 50%, #ff5a4a 100%)', accent: '#ff5a4a' },
  { title: 'Admin Command', slug: 'admin', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80', gradient: 'linear-gradient(135deg, #0C1016 0%, #1a2540 50%, #6b8cff 100%)', accent: '#6b8cff' },
  { title: 'Guest Portal', slug: 'guest', image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80', gradient: 'linear-gradient(135deg, #0C1016 0%, #1a3020 50%, #3ecf8e 100%)', accent: '#3ecf8e' },
  { title: 'Live Simulator', slug: 'simulator', image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80', gradient: 'linear-gradient(135deg, #0C1016 0%, #2a1a40 50%, #a86bff 100%)', accent: '#a86bff' },
] as const;

export const serviceCards = [
  {
    id: 'serviceItem0',
    line1: 'Digital Twin',
    line2: 'Platform',
    bg: '#0C1016',
    tagBg: '#10141C',
    tags: ['3D Floor Plans', 'Live Telemetry', 'Heat Maps', 'Godot Runtime', 'Occupancy'],
    description: 'Real-time Godot-powered 3D floor plans that expose fire, smoke, and occupant positions live across every floor of your property.',
  },
  {
    id: 'serviceItem1',
    line1: 'AI Intelligence',
    line2: 'Layer',
    bg: '#23272D',
    tagBg: '#20242A',
    tags: ['Gemini Routes', 'Bottleneck Prediction', 'Evacuation AI', 'Density Analysis', 'NLP Alerts'],
    description: 'AI predicts bottlenecks and drafts evacuation routes from density and hazard telemetry — seconds before human operators can react.',
  },
  {
    id: 'serviceItem2',
    line1: 'Operations',
    line2: 'Command',
    bg: '#3A3E44',
    tagBg: '#363A40',
    tags: ['Multi-Floor EOC', 'Staff Dispatch', 'Socket.io', 'Incident Feed', 'Triage'],
    description: 'Smart routing auto-assigns responders to high-risk zones with mobile escalation and sub-second command telemetry.',
  },
  {
    id: 'serviceItem3',
    line1: 'Enterprise',
    line2: 'GIS Stack',
    bg: '#50555A',
    tagBg: '#4C5157',
    tags: ['PostGIS', 'Multi-Tenancy', 'Data Isolation', 'Audit Logs', 'Compliance'],
    description: 'Built for compliance-heavy, high-occupancy properties. Every query is geographically isolated, audit-logged, and optimized at scale.',
  },
] as const;

export const navLinks = [
  { label: 'Platform', href: '#work' },
  { label: 'Capabilities', href: '#services' },
  { label: 'Contact', href: '#cta' },
] as const;
