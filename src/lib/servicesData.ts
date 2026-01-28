import type { Service } from './types';

const now = new Date().toISOString();

export const servicesData: Service[] = [
  {
    id: 'cctv-installation',
    icon: 'Cctv',
    title: 'CCTV New Installation',
    description: 'Professional site survey, cabling, device mounting, and DVR/NVR configuration for fresh deployments.',
    features: [
      'Up to 4 camera starter kits',
      'Mid-size setup up to 8 cameras',
      'Custom enterprise rollouts for 8+ cameras'
    ],
    badge: 'Popular',
    is_active: true,
    category: 'CCTV',
    display_order: 1,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cctv-repair',
    icon: 'Wrench',
    title: 'CCTV Repair Services',
    description: 'On-site and remote diagnostics for camera feeds, storage devices, and connectivity faults.',
    features: [
      'Camera realignment & lens swaps',
      'DVR/NVR reboot and firmware fixes',
      'Power supply & cabling replacements'
    ],
    badge: 'Recommended',
    is_active: true,
    category: 'CCTV',
    display_order: 2,
    created_at: now,
    updated_at: now
  },
  {
    id: 'cctv-amc',
    icon: 'Shield',
    title: 'CCTV AMC Services',
    description: 'Comprehensive annual maintenance for surveillance infrastructure with proactive health checks.',
    features: [
      'Quarterly preventive maintenance visits',
      'Camera cleaning and uptime audits',
      'Unlimited priority break-fix support'
    ],
    badge: 'New',
    is_active: true,
    category: 'CCTV',
    display_order: 3,
    created_at: now,
    updated_at: now
  },
  {
    id: 'computer-custom-setup',
    icon: 'Cpu',
    title: 'Computer – Customised Setup',
    description: 'Built-to-order desktops and workstations tuned for gaming, creatives, or office productivity.',
    features: [
      'Requirement capture & configuration design',
      'Component sourcing with warranty tracking',
      'Burn-in testing and ready-to-use delivery'
    ],
    badge: 'Popular',
    is_active: true,
    category: 'Computer',
    display_order: 4,
    created_at: now,
    updated_at: now
  },
  {
    id: 'computer-repair',
    icon: 'RefreshCw',
    title: 'Computer Repair Services',
    description: 'Fast turnaround for hardware faults, OS corruption, and performance drops.',
    features: [
      'Chip-level diagnostics and replacements',
      'Windows/Mac OS reinstallation with data safety',
      'Thermal service and performance tuning'
    ],
    badge: null,
    is_active: true,
    category: 'Computer',
    display_order: 5,
    created_at: now,
    updated_at: now
  },
  {
    id: 'web-development',
    icon: 'Code',
    title: 'Web Development Services',
    description: 'Professional website building with WhatsApp integration, admin dashboards, and custom designs.',
    features: [
      'Responsive Mobile-First Design',
      'SEO Optimization & Analytics',
      'Secure & Reliable Hosting Setup'
    ],
    badge: 'Featured',
    is_active: true,
    category: 'Web Services',
    display_order: 6,
    created_at: now,
    updated_at: now
  },
  {
    id: 'computer-upgrade',
    icon: 'Award',
    title: 'Computer Upgrade Services',
    description: 'Extend the life of existing systems with targeted performance upgrades.',
    features: [
      'RAM & SSD expansion bundles',
      'GPU/PSU upgrades with compatibility checks',
      'Firmware, BIOS, and driver optimization'
    ],
    badge: 'Recommended',
    is_active: true,
    category: 'Computer',
    display_order: 6,
    created_at: now,
    updated_at: now
  }
];