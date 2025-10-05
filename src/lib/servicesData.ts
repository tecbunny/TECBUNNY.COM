import type { Service } from '../lib/types';

export const servicesData: Service[] = [
  {
    id: 'tech-support',
    icon: 'Wrench',
    title: 'Technical Support',
    description: 'Expert technical assistance for all your devices and software needs.',
    features: ['Device Setup', 'Software Installation', 'Troubleshooting', 'Performance Optimization'],
    badge: 'Popular',
    is_active: true,
    category: 'Support',
    display_order: 1,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'extended-warranty',
    icon: 'Shield',
    title: 'Extended Warranty',
    description: 'Comprehensive protection plans for your valuable electronics.',
    features: ['Accidental Damage', 'Hardware Failures', 'Software Issues', 'Priority Support'],
    badge: 'Recommended',
    is_active: true,
    category: 'Support',
    display_order: 2,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'delivery-installation',
    icon: 'Truck',
    title: 'Delivery & Installation',
    description: 'Professional delivery and setup for your new equipment.',
    features: ['Same-Day Delivery', 'Professional Installation', 'Old Device Removal'],
    badge: 'New',
    is_active: true,
    category: 'Installation',
    display_order: 3,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'priority-support',
    icon: 'HeadphonesIcon',
    title: 'Priority Support',
    description: 'Get immediate access to our top-tier support specialists.',
    features: ['24/7 Availability', 'Dedicated Support Line', 'Remote Assistance'],
    is_active: true,
    category: 'Support',
    display_order: 4,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'trade-in',
    icon: 'RefreshCw',
    title: 'Trade-In Program',
    description: 'Trade in your old devices for credit towards new purchases.',
    features: ['Instant Credit', 'All Major Brands Accepted', 'Data Wiping Included'],
    is_active: true,
    category: 'Trade',
    display_order: 5,
    created_at: '',
    updated_at: ''
  },
  {
    id: 'certified-refurbished',
    icon: 'Award',
    title: 'Certified Refurbished',
    description: 'High-quality refurbished products at a fraction of the price.',
    features: ['1-Year Warranty', 'Thoroughly Inspected', 'Like-New Condition'],
    is_active: true,
    category: 'Trade',
    display_order: 6,
    created_at: '',
    updated_at: ''
  }
];