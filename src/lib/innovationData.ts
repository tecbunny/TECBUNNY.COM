import type { InnovationDevice, InnovationMode } from './types';

const now = new Date().toISOString();

export const innovationModesData: InnovationMode[] = [
  {
    id: 'innovation-mode-security',
    key: 'security',
    label: 'Fortress Mode',
    sub: 'Security & Monitoring',
    title: 'Fortress Configuration',
    description:
      'A robust perimeter defense setup utilizing door sensors, motion detection, and automated alert lighting.',
    icon: 'Shield',
    items: [
      { icon: 'DoorClosed', text: 'Entry Sensors', accent: 'text-violet-300' },
      { icon: 'Wifi', text: 'Motion Detectors', accent: 'text-violet-300' },
      { icon: 'Bell', text: 'Smart Siren', accent: 'text-violet-300' },
      { icon: 'Camera', text: 'IP Cam Integration', accent: 'text-violet-300' },
    ],
    rec_id: 'SEC-01',
    is_active: true,
    display_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'innovation-mode-chill',
    key: 'chill',
    label: 'Chill Ambience',
    sub: 'Lighting & Comfort',
    title: 'Relaxation Protocol',
    description:
      'Automated mood lighting and climate control designed for evening downtime and media consumption.',
    icon: 'Speaker',
    items: [
      { icon: 'Lightbulb', text: 'RGB Ambient Light', accent: 'text-cyan-300' },
      { icon: 'Cpu', text: 'Automation Logic', accent: 'text-cyan-300' },
      { icon: 'Speaker', text: 'Audio Sync', accent: 'text-cyan-300' },
      { icon: 'Zap', text: 'Dimmer Switches', accent: 'text-cyan-300' },
    ],
    rec_id: 'RLX-05',
    is_active: true,
    display_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'innovation-mode-energy',
    key: 'energy',
    label: 'Eco Saver',
    sub: 'Automation & Efficiency',
    title: 'Eco-Efficiency Grid',
    description:
      'Optimize power usage with smart scheduling for heavy appliances and precise radar sensing.',
    icon: 'Leaf',
    items: [
      { icon: 'Zap', text: 'Heavy Duty Plugs', accent: 'text-emerald-300' },
      { icon: 'Cpu', text: 'Schedule Timers', accent: 'text-emerald-300' },
      { icon: 'Leaf', text: 'Usage Monitoring', accent: 'text-emerald-300' },
      { icon: 'Wifi', text: 'mmWave Radar', accent: 'text-emerald-300' },
    ],
    rec_id: 'ECO-99',
    is_active: true,
    display_order: 3,
    created_at: now,
    updated_at: now,
  },
];

export const innovationDevicesData: InnovationDevice[] = [
  {
    id: 'innovation-device-lock',
    title: 'Biometric Smart Lock Pro',
    description: 'Fingerprint • RFID • App Control',
    accent: 'violet',
    icon: 'Shield',
    chips: ['1 Year Battery', 'AES-128 Enc', 'Remote Unlock', 'Tamper Alert'],
    is_active: true,
    display_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'innovation-device-mmwave',
    title: 'mmWave Presence Sensor',
    description: 'Micro-Motion Breath Detection',
    accent: 'cyan',
    icon: 'Wifi',
    chips: ['Sub-mm Accuracy', '24/7 Powered', 'Light Sensor', 'Zigbee 3.0'],
    is_active: true,
    display_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'innovation-device-neon',
    title: 'Neon Flex RGBIC',
    description: 'Addressable LED • Music Sync',
    accent: 'amber',
    icon: 'Lightbulb',
    chips: ['16M Colors', 'Voice Control', 'IP67 Waterproof', 'Auto Schedule'],
    is_active: true,
    display_order: 3,
    created_at: now,
    updated_at: now,
  },
];
