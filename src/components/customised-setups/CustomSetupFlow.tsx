'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { CustomSetupBlueprintComponentSummary, CustomSetupBlueprintSummary } from '@/lib/custom-setup-service';
import { cn } from '@/lib/utils';

export type SetupSystem = 'analog' | 'ip';

export interface CustomSetupFlowProps {
  blueprint: CustomSetupBlueprintSummary | null;
}

type PriceEntry = {
  id: string;
  label: string;
  mrp: number | null;
  sale: number;
};

type CapacityPriceEntry = PriceEntry & {
  capacity: number;
};

type CameraPriceMatrix = {
  standard: PriceEntry;
  dualLight: PriceEntry;
};

type CablePriceEntry = {
  id: string;
  label: string;
  coverageMeters: number;
  mrpPerUnit: number;
  salePerUnit: number;
};

interface AnalogPricing {
  dvr: CapacityPriceEntry[];
  smps: CapacityPriceEntry[];
  camera: Record<'2.4mp' | '5mp', CameraPriceMatrix>;
  cable: CablePriceEntry[];
}

interface IpPricing {
  nvr: CapacityPriceEntry[];
  poe: CapacityPriceEntry[];
  camera: Record<'2mp' | '4mp', CameraPriceMatrix>;
  cable: CablePriceEntry[];
}

const FALLBACK_ANALOG_PRICING: AnalogPricing = {
  dvr: [
    { id: 'dvr-4-2mp', label: '4 Channel DVR (2MP Model)', capacity: 4, mrp: 5199, sale: 2499 },
    { id: 'dvr-4-5mp', label: '4 Channel DVR (5MP Model)', capacity: 4, mrp: 5799, sale: 2799 },
    { id: 'dvr-8', label: '8 Channel DVR', capacity: 8, mrp: 6699, sale: 3799 },
    { id: 'dvr-16', label: '16 Channel DVR', capacity: 16, mrp: 19999, sale: 6999 },
    { id: 'dvr-32', label: '32 Channel DVR', capacity: 32, mrp: 32999, sale: 13999 },
  ] satisfies CapacityPriceEntry[],
  smps: [
    { id: 'smps-4', label: '4 Channel SMPS (5A)', capacity: 4, mrp: 1999, sale: 1249 },
    { id: 'smps-8', label: '8 Channel SMPS (10A)', capacity: 8, mrp: 2699, sale: 1699 },
    { id: 'smps-16', label: '16 Channel SMPS (20A)', capacity: 16, mrp: 3999, sale: 2599 },
  ] satisfies CapacityPriceEntry[],
  camera: {
    '2.4mp': {
      standard: { id: 'analog-2.4-standard', label: '2.4 MP Standard', mrp: 1899, sale: 1299 },
      dualLight: { id: 'analog-2.4-dual', label: '2.4 MP Dual-light', mrp: 2199, sale: 1499 },
    },
    '5mp': {
      standard: { id: 'analog-5-standard', label: '5 MP Standard', mrp: 2499, sale: 1799 },
      dualLight: { id: 'analog-5-dual', label: '5 MP Dual-light', mrp: 2899, sale: 2149 },
    },
  } satisfies Record<'2.4mp' | '5mp', CameraPriceMatrix>,
  cable: [
    { id: 'cable-coaxial-100m', label: 'CCTV Coaxial Cable (100m Roll)', coverageMeters: 100, mrpPerUnit: 3199, salePerUnit: 2499 },
  ] satisfies CablePriceEntry[],
};

const FALLBACK_IP_PRICING: IpPricing = {
  nvr: [
    { id: 'nvr-8', label: '8 Channel NVR', capacity: 8, mrp: 8999, sale: 5499 },
    { id: 'nvr-16', label: '16 Channel NVR', capacity: 16, mrp: 12999, sale: 7899 },
    { id: 'nvr-32', label: '32 Channel NVR', capacity: 32, mrp: 18999, sale: 11499 },
  ] satisfies CapacityPriceEntry[],
  poe: [
    { id: 'poe-8', label: '8 Port PoE Switch', capacity: 8, mrp: 4999, sale: 3199 },
    { id: 'poe-16', label: '16 Port PoE Switch', capacity: 16, mrp: 6999, sale: 4499 },
    { id: 'poe-32', label: '32 Port PoE Switch', capacity: 32, mrp: 10999, sale: 6999 },
  ] satisfies CapacityPriceEntry[],
  camera: {
    '2mp': {
      standard: { id: 'ip-2-standard', label: '2 MP Standard', mrp: 3299, sale: 2399 },
      dualLight: { id: 'ip-2-dual', label: '2 MP Dual-light', mrp: 3699, sale: 2699 },
    },
    '4mp': {
      standard: { id: 'ip-4-standard', label: '4 MP Standard', mrp: 4199, sale: 2999 },
      dualLight: { id: 'ip-4-dual', label: '4 MP Dual-light', mrp: 4899, sale: 3699 },
    },
  } satisfies Record<'2mp' | '4mp', CameraPriceMatrix>,
  cable: [{ id: 'cable-lan-100m', label: 'LAN Cable (100m Box)', coverageMeters: 100, mrpPerUnit: 3399, salePerUnit: 2699 }] satisfies CablePriceEntry[],
};

const FALLBACK_HDD_OPTIONS: PriceEntry[] = [
  { id: 'hdd-500', label: '500 GB Surveillance HDD', mrp: 3499, sale: 2699 },
  { id: 'hdd-1tb', label: '1 TB Surveillance HDD', mrp: 4499, sale: 3399 },
  { id: 'hdd-2tb', label: '2 TB Surveillance HDD', mrp: 5999, sale: 4699 },
];

const FALLBACK_MONITOR_OPTION: PriceEntry = {
  id: 'monitor-19',
  label: '19" Surveillance Monitor',
  mrp: 9999,
  sale: 7499,
};

const FALLBACK_INSTALLATION_OPTION: PriceEntry = {
  id: 'installation',
  label: 'On-site Installation & Configuration',
  mrp: 4500, // Set MRP equal to sale price for services (no discount typically offered)
  sale: 4500,
};

const SALE_PRICE_METADATA_KEYS = ['sale_price', 'salePrice', 'offer_price', 'offerPrice', 'discounted_price', 'discountedPrice'];

function readNumericMetadata(meta: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  const raw = meta[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const normalized = raw.replace(/[^0-9.\-]/g, '');
    if (!normalized.trim()) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBooleanMetadata(meta: Record<string, unknown> | null | undefined, key: string): boolean | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  const raw = meta[key];
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (['true', 'yes', '1'].includes(normalized)) {
      return true;
    }
    if (['false', 'no', '0'].includes(normalized)) {
      return false;
    }
  }
  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
  }
  return null;
}

function resolvePricePair(
  option: CustomSetupBlueprintComponentSummary['options'][number] | undefined,
  component: CustomSetupBlueprintComponentSummary | undefined,
  fallbackMrp: number,
  fallbackSale: number
): { mrp: number; sale: number } {
  const mrpSource = option?.unitPrice ?? component?.unitPrice ?? component?.basePrice ?? fallbackMrp;
  const saleMeta = option ? SALE_PRICE_METADATA_KEYS.map((key) => readNumericMetadata(option.metadata ?? null, key)).find((value) => value !== null) : null;
  const saleSource = saleMeta ?? fallbackSale ?? mrpSource;
  
  // Ensure both prices are positive
  const rawMrp = Math.max(0, mrpSource || 0);
  const rawSale = Math.max(0, saleSource || 0);
  
  // Logical pricing: MRP must be >= sale price
  // If MRP is 0 or null, use sale price as MRP (assuming sale is the actual retail price)
  // If sale > MRP, cap sale at MRP to maintain pricing logic
  let mrp: number;
  let sale: number;
  
  if (rawMrp === 0 && rawSale > 0) {
    // No MRP provided, use sale as MRP (common for services)
    mrp = rawSale;
    sale = rawSale;
  } else if (rawMrp > 0 && rawSale > rawMrp) {
    // Sale price higher than MRP (data error), cap sale at MRP
    mrp = rawMrp;
    sale = rawMrp;
  } else {
    // Normal case: MRP >= sale
    mrp = rawMrp;
    sale = Math.min(rawSale, rawMrp);
  }
  
  return { mrp, sale };
}

function parseChannelCapacity(label: string): number | null {
  const match = label.match(/(\d+)\s*channel/i);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCapacity(
  option: CustomSetupBlueprintComponentSummary['options'][number] | undefined,
  fallbackCapacity: number
): number {
  const metadataCapacity = option ? readNumericMetadata(option.metadata ?? null, 'channel_count') : null;
  if (metadataCapacity && Number.isFinite(metadataCapacity)) {
    return metadataCapacity;
  }
  if (option?.label) {
    const parsed = parseChannelCapacity(option.label);
    if (parsed) {
      return parsed;
    }
  }
  return fallbackCapacity;
}

function normalizeMegapixels(
  option: CustomSetupBlueprintComponentSummary['options'][number] | undefined,
  fallback: number
): number {
  const metadataMp = option ? readNumericMetadata(option.metadata ?? null, 'megapixels') : null;
  if (metadataMp && Number.isFinite(metadataMp)) {
    return metadataMp;
  }
  if (option?.label) {
    const match = option.label.match(/(\d+(?:\.\d+)?)\s*mp/i);
    if (match) {
      const parsed = Number.parseFloat(match[1]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function buildCapacityEntries(
  component: CustomSetupBlueprintComponentSummary | undefined,
  fallback: CapacityPriceEntry[]
): CapacityPriceEntry[] {
  if (!component) {
    return fallback;
  }

  const fallbackByCapacity = new Map<number, CapacityPriceEntry>(
    fallback.map((entry) => [entry.capacity, entry])
  );

  const entries: CapacityPriceEntry[] = [];

  component.options.forEach((option, index) => {
    const fallbackByIndex = fallback[index] ?? fallback[0] ?? null;
    const fallbackCapacity = fallbackByIndex?.capacity ?? fallback[0]?.capacity ?? 1;
    const capacity = Math.max(1, Math.round(normalizeCapacity(option, fallbackCapacity)));
    const fallbackEntry = fallbackByCapacity.get(capacity) ?? fallbackByIndex;
    const fallbackMrp = fallbackEntry?.mrp ?? fallbackByIndex?.mrp ?? 0;
    const fallbackSale = fallbackEntry?.sale ?? fallbackByIndex?.sale ?? 0;
    const { mrp, sale } = resolvePricePair(option, component, fallbackMrp, fallbackSale);

    entries.push({
      id: option.id,
      label: option.label || fallbackEntry?.label || component.name,
      capacity,
      mrp,
      sale,
    });
  });

  fallback.forEach((entry) => {
    if (!entries.some((candidate) => candidate.capacity === entry.capacity)) {
      entries.push(entry);
    }
  });

  return entries.sort((a, b) => a.capacity - b.capacity);
}

function buildCableEntries(
  component: CustomSetupBlueprintComponentSummary | undefined,
  fallback: CablePriceEntry[]
): CablePriceEntry[] {
  if (!component) {
    return fallback;
  }

  return fallback.map((entry) => {
    const option = component.options.find((candidate) => {
      const label = candidate.label?.toLowerCase() ?? '';
      const fallbackLower = entry.label.toLowerCase();
      if (fallbackLower.includes('lan') && label.includes('lan')) {
        return true;
      }
      if (fallbackLower.includes('coaxial') && (label.includes('coax') || label.includes('rg59'))) {
        return true;
      }
      return false;
    });

    if (!option) {
      return entry;
    }

    const coverage = readNumericMetadata(option.metadata ?? null, 'coverage_m') ?? entry.coverageMeters;
    const { mrp, sale } = resolvePricePair(option, component, entry.mrpPerUnit, entry.salePerUnit);

    return {
      id: option.id,
      label: option.label || entry.label,
      coverageMeters: coverage,
      mrpPerUnit: mrp,
      salePerUnit: sale,
    } satisfies CablePriceEntry;
  });
}

function buildCameraMatrix(
  component: CustomSetupBlueprintComponentSummary | undefined,
  resolutionKey: '2.4mp' | '5mp' | '2mp' | '4mp',
  fallback: CameraPriceMatrix
): CameraPriceMatrix {
  if (!component) {
    return fallback;
  }

  const targetMp = Number.parseFloat(resolutionKey.replace('mp', ''));

  const findOption = (dual: boolean) => {
    return component.options.find((option) => {
      const mp = normalizeMegapixels(option, targetMp);
      if (Math.abs(mp - targetMp) > 0.11) {
        return false;
      }
      const metaDual = readBooleanMetadata(option.metadata ?? null, 'dual_light');
      const label = option.label?.toLowerCase() ?? '';
      const isDual = metaDual ?? /dual/.test(label) ?? /two light/.test(label);
      return dual ? isDual : !isDual;
    });
  };

  const standardOption = findOption(false) ?? findOption(true);
  const dualOption = findOption(true) ?? standardOption;

  const standardPricing = standardOption
    ? (() => {
        const { mrp, sale } = resolvePricePair(standardOption, component, fallback.standard.mrp ?? 0, fallback.standard.sale);
        return {
          id: standardOption.id,
          label: standardOption.label || fallback.standard.label,
          mrp,
          sale,
        } satisfies PriceEntry;
      })()
    : fallback.standard;

  const dualPricing = dualOption
    ? (() => {
        const { mrp, sale } = resolvePricePair(dualOption, component, fallback.dualLight.mrp ?? 0, fallback.dualLight.sale);
        return {
          id: dualOption.id,
          label: dualOption.label || fallback.dualLight.label,
          mrp,
          sale,
        } satisfies PriceEntry;
      })()
    : fallback.dualLight;

  return {
    standard: standardPricing,
    dualLight: dualPricing,
  } satisfies CameraPriceMatrix;
}

function buildHddOptionsFromComponents(
  components: Array<CustomSetupBlueprintComponentSummary | undefined>,
  fallback: PriceEntry[]
): PriceEntry[] {
  const entries: PriceEntry[] = [];
  const seen = new Set<string>();

  for (const component of components) {
    if (!component) continue;
    component.options.forEach((option) => {
      const label = option.label ?? '';
      const capacityMatch = label.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
      const key = capacityMatch ? capacityMatch[0].toLowerCase() : option.id;
      if (seen.has(key)) {
        return;
      }
      const { mrp, sale } = resolvePricePair(option, component, option.unitPrice ?? component.unitPrice ?? component.basePrice ?? 0, option.unitPrice ?? component.unitPrice ?? component.basePrice ?? 0);
      entries.push({
        id: option.id,
        label: label || 'Storage option',
        mrp,
        sale,
      });
      seen.add(key);
    });
  }

  if (!entries.length) {
    return fallback;
  }

  return entries.sort((a, b) => a.label.localeCompare(b.label));
}

function pickFirstOption(component: CustomSetupBlueprintComponentSummary | undefined): PriceEntry | null {
  if (!component || !component.options.length) {
    return null;
  }
  const option = component.options[0];
  const { mrp, sale } = resolvePricePair(option, component, option.unitPrice ?? component.unitPrice ?? component.basePrice ?? 0, option.unitPrice ?? component.unitPrice ?? component.basePrice ?? 0);
  return {
    id: option.id,
    label: option.label ?? component.name,
    mrp,
    sale,
  } satisfies PriceEntry;
}

function buildPricingCatalog(blueprint: CustomSetupBlueprintSummary | null): {
  analog: AnalogPricing;
  ip: IpPricing;
  hddOptions: PriceEntry[];
  monitorOption: PriceEntry;
  installationOption: PriceEntry;
} {
  if (!blueprint) {
    return {
      analog: FALLBACK_ANALOG_PRICING,
      ip: FALLBACK_IP_PRICING,
      hddOptions: FALLBACK_HDD_OPTIONS,
      monitorOption: FALLBACK_MONITOR_OPTION,
      installationOption: FALLBACK_INSTALLATION_OPTION,
    };
  }

  const analogSystem = blueprint.systems.find((system) => system.slug === 'dvr-system');
  const ipSystem = blueprint.systems.find((system) => system.slug === 'nvr-system');

  const analogPricing: AnalogPricing = {
    dvr: buildCapacityEntries(
      analogSystem?.components.find((component) => component.slug === 'dvr-recorder'),
      FALLBACK_ANALOG_PRICING.dvr
    ),
    smps: buildCapacityEntries(
      analogSystem?.components.find((component) => component.slug === 'smps-power'),
      FALLBACK_ANALOG_PRICING.smps
    ),
    camera: {
      '2.4mp': buildCameraMatrix(
        analogSystem?.components.find((component) => component.slug === 'analog-camera'),
        '2.4mp',
        FALLBACK_ANALOG_PRICING.camera['2.4mp']
      ),
      '5mp': buildCameraMatrix(
        analogSystem?.components.find((component) => component.slug === 'analog-camera'),
        '5mp',
        FALLBACK_ANALOG_PRICING.camera['5mp']
      ),
    },
    cable: buildCableEntries(
      analogSystem?.components.find((component) => component.slug === 'coaxial-cable'),
      FALLBACK_ANALOG_PRICING.cable
    ),
  } satisfies AnalogPricing;

  const ipPricing: IpPricing = {
    nvr: buildCapacityEntries(
      ipSystem?.components.find((component) => component.slug === 'nvr-recorder'),
      FALLBACK_IP_PRICING.nvr
    ),
    poe: buildCapacityEntries(
      ipSystem?.components.find((component) => component.slug === 'poe-switch'),
      FALLBACK_IP_PRICING.poe
    ),
    camera: {
      '2mp': buildCameraMatrix(
        ipSystem?.components.find((component) => component.slug === 'ip-camera'),
        '2mp',
        FALLBACK_IP_PRICING.camera['2mp']
      ),
      '4mp': buildCameraMatrix(
        ipSystem?.components.find((component) => component.slug === 'ip-camera'),
        '4mp',
        FALLBACK_IP_PRICING.camera['4mp']
      ),
    },
    cable: buildCableEntries(
      ipSystem?.components.find((component) => component.slug === 'cat6-cable'),
      FALLBACK_IP_PRICING.cable
    ),
  } satisfies IpPricing;

  const hddOptions = buildHddOptionsFromComponents(
    [
      analogSystem?.components.find((component) => component.slug === 'dvr-storage'),
      ipSystem?.components.find((component) => component.slug === 'nvr-storage'),
    ],
    FALLBACK_HDD_OPTIONS
  );

  const monitorComponent =
    analogSystem?.components.find((component) => component.slug.includes('monitor')) ??
    ipSystem?.components.find((component) => component.slug.includes('monitor'));

  const installationComponent =
    analogSystem?.components.find((component) => component.slug === 'installation-service') ??
    ipSystem?.components.find((component) => component.slug === 'installation-service');

  const monitorOption = pickFirstOption(monitorComponent) ?? FALLBACK_MONITOR_OPTION;
  const installationOption = pickFirstOption(installationComponent) ?? FALLBACK_INSTALLATION_OPTION;

  return {
    analog: analogPricing,
    ip: ipPricing,
    hddOptions,
    monitorOption,
    installationOption,
  };
}

function pickCapacityOption(options: CapacityPriceEntry[], cameraCount: number): CapacityPriceEntry {
  const sorted = [...options].sort((a, b) => a.capacity - b.capacity);
  return sorted.find((entry) => entry.capacity >= cameraCount) ?? sorted[sorted.length - 1];
}

function calculateQuantity(cameraCount: number, capacity: number): number {
  if (capacity <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(cameraCount / capacity));
}

const AVERAGE_RUN_METERS_PER_CAMERA = 25;

function calculateCableQuantity(cameraCount: number, cable: CablePriceEntry): number {
  const totalRun = Math.max(1, cameraCount) * AVERAGE_RUN_METERS_PER_CAMERA;
  const coverage = Math.max(1, cable.coverageMeters);
  return Math.max(1, Math.ceil(totalRun / coverage));
}

function recommendedAnalogDvrCapacity(cameraCount: number): number {
  if (cameraCount <= 4) {
    return 4;
  }
  if (cameraCount <= 8) {
    return 8;
  }
  if (cameraCount <= 16) {
    return 16;
  }
  return 32;
}

function recommendedAnalogSmpsCapacity(cameraCount: number): number {
  if (cameraCount <= 4) {
    return 4;
  }
  if (cameraCount <= 8) {
    return 8;
  }
  return 16;
}

function recommendedIpCapacity(cameraCount: number): number {
  if (cameraCount <= 8) {
    return 8;
  }
  if (cameraCount <= 16) {
    return 16;
  }
  return 32;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(value));
}

interface AnalogSelections {
  dvrId: string;
  smpsId: string;
  cableId: string;
  resolution: '2.4mp' | '5mp';
  dualLight: boolean;
}

interface IpSelections {
  nvrId: string;
  poeId: string;
  cableId: string;
  resolution: '2mp' | '4mp';
  dualLight: boolean;
}

interface Totals {
  system: { mrp: number; sale: number; breakdown: string[] };
  hdd: { mrp: number; sale: number; label: string };
  monitor: { mrp: number; sale: number; included: boolean };
  installation: { mrp: number; sale: number; included: boolean };
  overall: { mrp: number; sale: number; discountAmount: number; discountPercent: number };
}

function buildAnalogSystemSummary(cameraCount: number, selections: AnalogSelections, pricing: AnalogPricing): {
  mrp: number;
  sale: number;
  breakdown: string[];
} {
  const dvr = pricing.dvr.find((entry) => entry.id === selections.dvrId) ?? pricing.dvr[0];
  const smps = pricing.smps.find((entry) => entry.id === selections.smpsId) ?? pricing.smps[0];
  const cable = pricing.cable.find((entry) => entry.id === selections.cableId) ?? pricing.cable[0];
  const cameraMatrix = pricing.camera[selections.resolution];
  const cameraPricing = selections.dualLight ? cameraMatrix.dualLight : cameraMatrix.standard;

  const smpsQuantity = calculateQuantity(cameraCount, smps.capacity);
  const cableQuantity = calculateCableQuantity(cameraCount, cable);

  const mrp =
    (dvr.mrp ?? 0) +
    (smps.mrp ?? 0) * smpsQuantity +
    (cameraPricing.mrp ?? 0) * cameraCount +
    (cable.mrpPerUnit ?? 0) * cableQuantity;
  const sale =
    dvr.sale +
    smps.sale * smpsQuantity +
    cameraPricing.sale * cameraCount +
    cable.salePerUnit * cableQuantity;

  const breakdown: string[] = [
    `${dvr.label} (${formatCurrency(dvr.sale)})`,
    `${smpsQuantity} × ${smps.label} (${formatCurrency(smps.sale * smpsQuantity)})`,
    `${cameraCount} × ${cameraPricing.label} (${formatCurrency(cameraPricing.sale * cameraCount)})`,
    `${cableQuantity} × ${cable.label} (${formatCurrency(cable.salePerUnit * cableQuantity)})`,
  ];

  return { mrp, sale, breakdown };
}

function buildIpSystemSummary(cameraCount: number, selections: IpSelections, pricing: IpPricing): {
  mrp: number;
  sale: number;
  breakdown: string[];
} {
  const nvr = pricing.nvr.find((entry) => entry.id === selections.nvrId) ?? pricing.nvr[0];
  const poe = pricing.poe.find((entry) => entry.id === selections.poeId) ?? pricing.poe[0];
  const cable = pricing.cable.find((entry) => entry.id === selections.cableId) ?? pricing.cable[0];
  const cameraMatrix = pricing.camera[selections.resolution];
  const cameraPricing = selections.dualLight ? cameraMatrix.dualLight : cameraMatrix.standard;

  const poeQuantity = calculateQuantity(cameraCount, poe.capacity);
  const cableQuantity = calculateCableQuantity(cameraCount, cable);

  const mrp =
    (nvr.mrp ?? 0) +
    (poe.mrp ?? 0) * poeQuantity +
    (cameraPricing.mrp ?? 0) * cameraCount +
    (cable.mrpPerUnit ?? 0) * cableQuantity;
  const sale =
    nvr.sale +
    poe.sale * poeQuantity +
    cameraPricing.sale * cameraCount +
    cable.salePerUnit * cableQuantity;

  const breakdown: string[] = [
    `${nvr.label} (${formatCurrency(nvr.sale)})`,
    `${poeQuantity} × ${poe.label} (${formatCurrency(poe.sale * poeQuantity)})`,
    `${cameraCount} × ${cameraPricing.label} (${formatCurrency(cameraPricing.sale * cameraCount)})`,
    `${cableQuantity} × ${cable.label} (${formatCurrency(cable.salePerUnit * cableQuantity)})`,
  ];

  return { mrp, sale, breakdown };
}

export function CustomSetupFlow({ blueprint }: CustomSetupFlowProps) {
  const pricingCatalog = useMemo(() => buildPricingCatalog(blueprint), [blueprint]);
  const analogPricing = pricingCatalog.analog;
  const ipPricing = pricingCatalog.ip;
  const hddOptions = pricingCatalog.hddOptions;
  const monitorOption = pricingCatalog.monitorOption;
  const installationOption = pricingCatalog.installationOption;
  const selectableHddOptions = hddOptions.length ? hddOptions : FALLBACK_HDD_OPTIONS;

  // Debug: Log pricing source - disabled for production
  // console.log('CustomSetupFlow pricing source:', {
  //   hasBlueprintData: !!blueprint,
  //   blueprintSystems: blueprint?.systems?.length || 0,
  //   usingFallback: !blueprint,
  //   timestamp: new Date().toISOString(),
  //   sampleDvrPricing: analogPricing.dvr[0] || null
  // });

  const [system, setSystem] = useState<SetupSystem>('analog');
  const [cameraCount, setCameraCount] = useState<number>(4);
  const [cameraCountInput, setCameraCountInput] = useState<string>('4');
  const [analogSelections, setAnalogSelections] = useState<AnalogSelections>({
    dvrId: analogPricing.dvr[0]?.id ?? FALLBACK_ANALOG_PRICING.dvr[0].id,
    smpsId: analogPricing.smps[0]?.id ?? FALLBACK_ANALOG_PRICING.smps[0].id,
    cableId: analogPricing.cable[0]?.id ?? FALLBACK_ANALOG_PRICING.cable[0].id,
    resolution: '2.4mp',
    dualLight: false,
  });
  const [ipSelections, setIpSelections] = useState<IpSelections>({
    nvrId: ipPricing.nvr[0]?.id ?? FALLBACK_IP_PRICING.nvr[0].id,
    poeId: ipPricing.poe[0]?.id ?? FALLBACK_IP_PRICING.poe[0].id,
    cableId: ipPricing.cable[0]?.id ?? FALLBACK_IP_PRICING.cable[0].id,
    resolution: '2mp',
    dualLight: false,
  });
  const [hddId, setHddId] = useState<string>(
    selectableHddOptions[1]?.id ?? selectableHddOptions[0]?.id ?? FALLBACK_HDD_OPTIONS[0].id
  );
  const [monitorIncluded, setMonitorIncluded] = useState<boolean>(false);
  const [installationIncluded, setInstallationIncluded] = useState<boolean>(true);

  useEffect(() => {
    const normalized = Number.isFinite(cameraCount) ? Math.min(32, Math.max(1, Math.round(cameraCount))) : 4;
    if (normalized !== cameraCount) {
      setCameraCount(normalized);
      setCameraCountInput(normalized.toString());
    }
  }, [cameraCount]);

  // Handle camera count input changes
  const handleCameraCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCameraCountInput(value);
    
    // Only update the actual count if it's a valid number
    const numValue = Number.parseInt(value, 10);
    if (!isNaN(numValue) && value !== '') {
      const normalized = Math.min(32, Math.max(1, numValue));
      setCameraCount(normalized);
    }
  };

  // Handle when user finishes editing (blur event)
  const handleCameraCountBlur = () => {
    const numValue = Number.parseInt(cameraCountInput, 10);
    if (isNaN(numValue) || cameraCountInput === '') {
      // Reset to current valid value if input is invalid or empty
      setCameraCountInput(cameraCount.toString());
    } else {
      // Normalize the value
      const normalized = Math.min(32, Math.max(1, numValue));
      setCameraCount(normalized);
      setCameraCountInput(normalized.toString());
    }
  };

  useEffect(() => {
    setAnalogSelections((previous) => {
      const resolvedDvrId = analogPricing.dvr.some((entry) => entry.id === previous.dvrId)
        ? previous.dvrId
        : analogPricing.dvr[0]?.id ?? FALLBACK_ANALOG_PRICING.dvr[0].id;
      const resolvedSmpsId = analogPricing.smps.some((entry) => entry.id === previous.smpsId)
        ? previous.smpsId
        : analogPricing.smps[0]?.id ?? FALLBACK_ANALOG_PRICING.smps[0].id;
      const resolvedCableId = analogPricing.cable.some((entry) => entry.id === previous.cableId)
        ? previous.cableId
        : analogPricing.cable[0]?.id ?? FALLBACK_ANALOG_PRICING.cable[0].id;

      if (resolvedDvrId === previous.dvrId && resolvedSmpsId === previous.smpsId && resolvedCableId === previous.cableId) {
        return previous;
      }

      return { ...previous, dvrId: resolvedDvrId, smpsId: resolvedSmpsId, cableId: resolvedCableId } satisfies AnalogSelections;
    });
  }, [analogPricing]);

  useEffect(() => {
    setIpSelections((previous) => {
      const resolvedNvrId = ipPricing.nvr.some((entry) => entry.id === previous.nvrId)
        ? previous.nvrId
        : ipPricing.nvr[0]?.id ?? FALLBACK_IP_PRICING.nvr[0].id;
      const resolvedPoeId = ipPricing.poe.some((entry) => entry.id === previous.poeId)
        ? previous.poeId
        : ipPricing.poe[0]?.id ?? FALLBACK_IP_PRICING.poe[0].id;
      const resolvedCableId = ipPricing.cable.some((entry) => entry.id === previous.cableId)
        ? previous.cableId
        : ipPricing.cable[0]?.id ?? FALLBACK_IP_PRICING.cable[0].id;

      if (resolvedNvrId === previous.nvrId && resolvedPoeId === previous.poeId && resolvedCableId === previous.cableId) {
        return previous;
      }

      return { ...previous, nvrId: resolvedNvrId, poeId: resolvedPoeId, cableId: resolvedCableId } satisfies IpSelections;
    });
  }, [ipPricing]);

  useEffect(() => {
    setHddId((previous) => {
      if (selectableHddOptions.some((entry) => entry.id === previous)) {
        return previous;
      }
      return selectableHddOptions[0]?.id ?? FALLBACK_HDD_OPTIONS[0].id;
    });
  }, [selectableHddOptions]);

  useEffect(() => {
    const recommendedDvrCapacity = recommendedAnalogDvrCapacity(cameraCount);
    const recommendedDvr = pickCapacityOption(analogPricing.dvr, recommendedDvrCapacity);
    const currentDvr = analogPricing.dvr.find((entry) => entry.id === analogSelections.dvrId);
    if (!currentDvr || currentDvr.capacity < recommendedDvrCapacity) {
      setAnalogSelections((previous) => ({ ...previous, dvrId: recommendedDvr.id }));
    }

    const recommendedSmpsCapacity = recommendedAnalogSmpsCapacity(cameraCount);
    const recommendedSmps = pickCapacityOption(analogPricing.smps, recommendedSmpsCapacity);
    const currentSmps = analogPricing.smps.find((entry) => entry.id === analogSelections.smpsId);
    if (!currentSmps || currentSmps.capacity < recommendedSmpsCapacity) {
      setAnalogSelections((previous) => ({ ...previous, smpsId: recommendedSmps.id }));
    }
  }, [analogPricing, analogSelections.dvrId, analogSelections.smpsId, cameraCount]);

  useEffect(() => {
    const recommendedNvrCapacity = recommendedIpCapacity(cameraCount);
    const recommendedNvr = pickCapacityOption(ipPricing.nvr, recommendedNvrCapacity);
    const currentNvr = ipPricing.nvr.find((entry) => entry.id === ipSelections.nvrId);
    if (!currentNvr || currentNvr.capacity < recommendedNvrCapacity) {
      setIpSelections((previous) => ({ ...previous, nvrId: recommendedNvr.id }));
    }

    const recommendedPoeCapacity = recommendedIpCapacity(cameraCount);
    const recommendedPoe = pickCapacityOption(ipPricing.poe, recommendedPoeCapacity);
    const currentPoe = ipPricing.poe.find((entry) => entry.id === ipSelections.poeId);
    if (!currentPoe || currentPoe.capacity < recommendedPoeCapacity) {
      setIpSelections((previous) => ({ ...previous, poeId: recommendedPoe.id }));
    }
  }, [cameraCount, ipPricing, ipSelections.nvrId, ipSelections.poeId]);

  const totals: Totals = useMemo(() => {
    const systemSummary = system === 'analog'
      ? buildAnalogSystemSummary(cameraCount, analogSelections, analogPricing)
      : buildIpSystemSummary(cameraCount, ipSelections, ipPricing);

    const hdd = selectableHddOptions.find((entry) => entry.id === hddId) ?? selectableHddOptions[0];
    const monitorMrp = monitorIncluded ? monitorOption.mrp ?? 0 : 0;
    const monitorSale = monitorIncluded ? monitorOption.sale : 0;
    const installationMrp = installationIncluded ? installationOption.mrp ?? installationOption.sale : 0;
    const installationSale = installationIncluded ? installationOption.sale : 0;

    const overallMrp = systemSummary.mrp + (hdd.mrp ?? 0) + monitorMrp + installationMrp;
    const overallSale = systemSummary.sale + hdd.sale + monitorSale + installationSale;
    
    // Ensure MRP is never less than sale price (data integrity check)
    const validatedMrp = Math.max(overallMrp, overallSale);
    const validatedSale = Math.min(overallSale, validatedMrp);
    
    const discountAmount = Math.max(0, Math.round(validatedMrp - validatedSale));
    const discountPercent = validatedMrp > 0 ? (discountAmount / validatedMrp) * 100 : 0;

    return {
      system: systemSummary,
      hdd: { mrp: hdd.mrp ?? 0, sale: hdd.sale, label: hdd.label },
      monitor: { mrp: monitorMrp, sale: monitorSale, included: monitorIncluded },
      installation: { mrp: installationMrp, sale: installationSale, included: installationIncluded },
      overall: {
        mrp: validatedMrp,
        sale: validatedSale,
        discountAmount,
        discountPercent,
      },
    } satisfies Totals;
  }, [analogPricing, analogSelections, cameraCount, hddId, installationIncluded, installationOption, monitorIncluded, monitorOption, ipPricing, ipSelections, selectableHddOptions, system]);

  const activeAnalog = system === 'analog';

  const renderAnalogControls = () => {
    const recommendedDvrCapacity = recommendedAnalogDvrCapacity(cameraCount);
    const recommendedSmpsCapacity = recommendedAnalogSmpsCapacity(cameraCount);

    return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>DVR & Power</CardTitle>
          <CardDescription>Auto-matched to the current camera count. You can upgrade to higher capacity if desired.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="analog-dvr">DVR Recorder</Label>
            <Select
              value={analogSelections.dvrId}
              onValueChange={(value) => setAnalogSelections((previous) => ({ ...previous, dvrId: value }))}
            >
              <SelectTrigger id="analog-dvr">
                <SelectValue placeholder="Select DVR" />
              </SelectTrigger>
              <SelectContent>
                {analogPricing.dvr.map((option) => {
                  const isRecommended = option.capacity === recommendedDvrCapacity;
                  const isDisabled = option.capacity < recommendedDvrCapacity;
                  return (
                    <SelectItem key={option.id} value={option.id} disabled={isDisabled}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          Supports up to {option.capacity} cameras · {formatCurrency(option.sale)} sale
                          {isRecommended ? ' · Recommended' : ''}
                          {isDisabled ? ' · Min capacity not met' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="analog-smps">SMPS Power Supply</Label>
            <Select
              value={analogSelections.smpsId}
              onValueChange={(value) => setAnalogSelections((previous) => ({ ...previous, smpsId: value }))}
            >
              <SelectTrigger id="analog-smps">
                <SelectValue placeholder="Select SMPS" />
              </SelectTrigger>
              <SelectContent>
                {analogPricing.smps.map((option) => {
                  const quantity = calculateQuantity(cameraCount, option.capacity);
                  const totalSale = option.sale * quantity;
                  const isRecommended = option.capacity === recommendedSmpsCapacity;
                  const isDisabled = option.capacity < recommendedSmpsCapacity;
                  return (
                    <SelectItem key={option.id} value={option.id} disabled={isDisabled}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {quantity} unit{quantity > 1 ? 's' : ''} for {cameraCount} cameras · {formatCurrency(totalSale)} sale
                          {isRecommended ? ' · Recommended' : ''}
                          {isDisabled ? ' · Min capacity not met' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cameras & Cabling</CardTitle>
          <CardDescription>Choose the megapixel rating and whether you need dual-light capability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Camera Resolution</Label>
              <RadioGroup
                value={analogSelections.resolution}
                onValueChange={(value: '2.4mp' | '5mp') => setAnalogSelections((previous) => ({ ...previous, resolution: value }))}
                className="grid gap-2"
              >
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', analogSelections.resolution === '2.4mp' && 'border-primary')}
                  htmlFor="analog-res-24">
                  <div>
                    <span className="block font-medium">2.4 MP</span>
                    <span className="text-xs text-muted-foreground">Balanced clarity with lower bandwidth</span>
                  </div>
                  <RadioGroupItem value="2.4mp" id="analog-res-24" />
                </Label>
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', analogSelections.resolution === '5mp' && 'border-primary')}
                  htmlFor="analog-res-5">
                  <div>
                    <span className="block font-medium">5 MP</span>
                    <span className="text-xs text-muted-foreground">Higher detail for wider coverage</span>
                  </div>
                  <RadioGroupItem value="5mp" id="analog-res-5" />
                </Label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Dual-light Capability</Label>
              <RadioGroup
                value={analogSelections.dualLight ? 'yes' : 'no'}
                onValueChange={(value) => setAnalogSelections((previous) => ({ ...previous, dualLight: value === 'yes' }))}
                className="grid gap-2"
              >
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', !analogSelections.dualLight && 'border-primary')}
                  htmlFor="analog-dual-no">
                  <div>
                    <span className="block font-medium">Standard IR</span>
                    <span className="text-xs text-muted-foreground">Best for typical day/night surveillance</span>
                  </div>
                  <RadioGroupItem value="no" id="analog-dual-no" />
                </Label>
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', analogSelections.dualLight && 'border-primary')}
                  htmlFor="analog-dual-yes">
                  <div>
                    <span className="block font-medium">Dual-light</span>
                    <span className="text-xs text-muted-foreground">Switches between IR & warm light for colour video</span>
                  </div>
                  <RadioGroupItem value="yes" id="analog-dual-yes" />
                </Label>
              </RadioGroup>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="analog-cable">Cable Preference</Label>
            <Select
              value={analogSelections.cableId}
              onValueChange={(value) => setAnalogSelections((previous) => ({ ...previous, cableId: value }))}
            >
              <SelectTrigger id="analog-cable">
                <SelectValue placeholder="Select cable" />
              </SelectTrigger>
                 <SelectContent>
                {analogPricing.cable.map((option) => {
                  const quantity = calculateCableQuantity(cameraCount, option);
                  const totalSale = option.salePerUnit * quantity;
                  return (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          100 m coverage per unit · Est. {quantity} unit{quantity > 1 ? 's' : ''} · {formatCurrency(totalSale)} sale
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  };

  const renderIpControls = () => {
    const recommendedCapacity = recommendedIpCapacity(cameraCount);

    return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>NVR & PoE Switching</CardTitle>
          <CardDescription>Auto-optimised for the camera count. Upgrade to higher tiers for expansion headroom.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ip-nvr">NVR Recorder</Label>
            <Select value={ipSelections.nvrId} onValueChange={(value) => setIpSelections((previous) => ({ ...previous, nvrId: value }))}>
              <SelectTrigger id="ip-nvr">
                <SelectValue placeholder="Select NVR" />
              </SelectTrigger>
              <SelectContent>
                {ipPricing.nvr.map((option) => {
                  const isRecommended = option.capacity === recommendedCapacity;
                  const isDisabled = option.capacity < recommendedCapacity;
                  return (
                    <SelectItem key={option.id} value={option.id} disabled={isDisabled}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          Supports {option.capacity} cameras · {formatCurrency(option.sale)} sale
                          {isRecommended ? ' · Recommended' : ''}
                          {isDisabled ? ' · Min capacity not met' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-poe">PoE Switch</Label>
            <Select value={ipSelections.poeId} onValueChange={(value) => setIpSelections((previous) => ({ ...previous, poeId: value }))}>
              <SelectTrigger id="ip-poe">
                <SelectValue placeholder="Select PoE switch" />
              </SelectTrigger>
              <SelectContent>
                {ipPricing.poe.map((option) => {
                  const quantity = calculateQuantity(cameraCount, option.capacity);
                  const totalSale = option.sale * quantity;
                  const isRecommended = option.capacity === recommendedCapacity;
                  const isDisabled = option.capacity < recommendedCapacity;
                  return (
                    <SelectItem key={option.id} value={option.id} disabled={isDisabled}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {quantity} unit{quantity > 1 ? 's' : ''} · {formatCurrency(totalSale)} sale
                          {isRecommended ? ' · Recommended' : ''}
                          {isDisabled ? ' · Min capacity not met' : ''}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cameras & Cabling</CardTitle>
          <CardDescription>Pick your preferred megapixel profile and colour-at-night capability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Camera Resolution</Label>
              <RadioGroup
                value={ipSelections.resolution}
                onValueChange={(value: '2mp' | '4mp') => setIpSelections((previous) => ({ ...previous, resolution: value }))}
                className="grid gap-2"
              >
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', ipSelections.resolution === '2mp' && 'border-primary')}
                  htmlFor="ip-res-2">
                  <div>
                    <span className="block font-medium">2 MP</span>
                    <span className="text-xs text-muted-foreground">Ideal for compact deployments</span>
                  </div>
                  <RadioGroupItem value="2mp" id="ip-res-2" />
                </Label>
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', ipSelections.resolution === '4mp' && 'border-primary')}
                  htmlFor="ip-res-4">
                  <div>
                    <span className="block font-medium">4 MP</span>
                    <span className="text-xs text-muted-foreground">Sharper detail for analytics</span>
                  </div>
                  <RadioGroupItem value="4mp" id="ip-res-4" />
                </Label>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Dual-light Capability</Label>
              <RadioGroup
                value={ipSelections.dualLight ? 'yes' : 'no'}
                onValueChange={(value) => setIpSelections((previous) => ({ ...previous, dualLight: value === 'yes' }))}
                className="grid gap-2"
              >
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', !ipSelections.dualLight && 'border-primary')}
                  htmlFor="ip-dual-no">
                  <div>
                    <span className="block font-medium">Standard IR</span>
                    <span className="text-xs text-muted-foreground">Monochrome at night</span>
                  </div>
                  <RadioGroupItem value="no" id="ip-dual-no" />
                </Label>
                <Label className={cn('flex cursor-pointer items-center justify-between rounded-md border p-3', ipSelections.dualLight && 'border-primary')}
                  htmlFor="ip-dual-yes">
                  <div>
                    <span className="block font-medium">Dual-light</span>
                    <span className="text-xs text-muted-foreground">Colour capture at night</span>
                  </div>
                  <RadioGroupItem value="yes" id="ip-dual-yes" />
                </Label>
              </RadioGroup>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-cable">Cabling</Label>
            <Select value={ipSelections.cableId} onValueChange={(value) => setIpSelections((previous) => ({ ...previous, cableId: value }))}>
              <SelectTrigger id="ip-cable">
                <SelectValue placeholder="Select cable" />
              </SelectTrigger>
              <SelectContent>
                {ipPricing.cable.map((option) => {
                  const quantity = calculateCableQuantity(cameraCount, option);
                  const totalSale = option.salePerUnit * quantity;
                  return (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          100 m coverage per unit · Est. {quantity} unit{quantity > 1 ? 's' : ''} · {formatCurrency(totalSale)} sale
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  };

  return (
    <section className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Configure your surveillance stack</CardTitle>
          <CardDescription>Adjust the camera count and component preferences to instantly preview bundled MRP and sale totals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Choose recorder path</Label>
            <RadioGroup value={system} onValueChange={(value: SetupSystem) => setSystem(value)} className="grid gap-3 sm:grid-cols-2">
              <Label className={cn('flex cursor-pointer items-center justify-between rounded-lg border p-4', system === 'analog' && 'border-primary')}
                htmlFor="system-analog">
                <div>
                  <span className="block text-lg font-semibold">Analog (DVR)</span>
                  <span className="text-xs text-muted-foreground">Best for coaxial retrofits and budget installations</span>
                </div>
                <RadioGroupItem value="analog" id="system-analog" />
              </Label>
              <Label className={cn('flex cursor-pointer items-center justify-between rounded-lg border p-4', system === 'ip' && 'border-primary')}
                htmlFor="system-ip">
                <div>
                  <span className="block text-lg font-semibold">IP (NVR)</span>
                  <span className="text-xs text-muted-foreground">PoE-based deployments with smart analytics</span>
                </div>
                <RadioGroupItem value="ip" id="system-ip" />
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="camera-count">Number of cameras</Label>
            <Input
              id="camera-count"
              type="number"
              min={1}
              max={32}
              value={cameraCountInput}
              onChange={handleCameraCountChange}
              onBlur={handleCameraCountBlur}
              placeholder="Enter number of cameras"
            />
            <p className="text-xs text-muted-foreground">Supported range: 1 to 32 cameras.</p>
          </div>
        </CardContent>
      </Card>

      {activeAnalog ? renderAnalogControls() : renderIpControls()}

      <Card>
        <CardHeader>
          <CardTitle>Storage & Add-ons</CardTitle>
          <CardDescription>Select the storage capacity and optional add-ons to complete your build.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="hdd-option">Surveillance HDD</Label>
            <Select value={hddId} onValueChange={(value) => setHddId(value)}>
              <SelectTrigger id="hdd-option">
                <SelectValue placeholder="Select drive capacity" />
              </SelectTrigger>
              <SelectContent>
                {selectableHddOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.mrp ? `${formatCurrency(option.mrp)} MRP · ` : ''}{formatCurrency(option.sale)} sale
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-md border p-4">
              <Checkbox id="monitor-required" checked={monitorIncluded} onCheckedChange={(checked) => setMonitorIncluded(Boolean(checked))} />
              <div>
                <Label htmlFor="monitor-required" className="text-base font-semibold">Include surveillance monitor</Label>
                <p className="text-xs text-muted-foreground">
                  {monitorIncluded ? 'Currently included: ' : 'Adds: '}
                  {monitorOption.label} ({formatCurrency(monitorOption.sale)} sale{monitorOption.mrp ? ` · ${formatCurrency(monitorOption.mrp)} MRP` : ''}).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-4">
              <Checkbox id="installation-required" checked={installationIncluded} onCheckedChange={(checked) => setInstallationIncluded(Boolean(checked))} />
              <div>
                <Label htmlFor="installation-required" className="text-base font-semibold">Include installation service</Label>
                <p className="text-xs text-muted-foreground">
                  {installationIncluded ? 'Currently included: ' : 'Adds: '}
                  {installationOption.label} ({formatCurrency(installationOption.sale)} sale{installationOption.mrp ? ` · ${formatCurrency(installationOption.mrp)} MRP` : ' · No MRP'}).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>Total investment preview</CardTitle>
          <CardDescription>Final proposal will reconfirm inventory and site dependencies before order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="flex items-center justify-between text-sm font-medium">
              <span>System (recorder, power, cameras, cabling)</span>
              <span>{formatCurrency(totals.system.sale)} sale{totals.system.mrp ? ` · ${formatCurrency(totals.system.mrp)} MRP` : ''}</span>
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {totals.system.breakdown.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{totals.hdd.label}</span>
              <span>
                {formatCurrency(totals.hdd.sale)} sale{totals.hdd.mrp ? ` · ${formatCurrency(totals.hdd.mrp)} MRP` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Monitor</span>
              {totals.monitor.included ? (
                <span>
                  {formatCurrency(totals.monitor.sale)} sale{totals.monitor.mrp ? ` · ${formatCurrency(totals.monitor.mrp)} MRP` : ''}
                </span>
              ) : (
                <Badge variant="outline">Not included</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Installation</span>
              {totals.installation.included ? (
                <span>
                  {formatCurrency(totals.installation.sale)} sale{totals.installation.mrp ? ` · ${formatCurrency(totals.installation.mrp)} MRP` : ' · No MRP'}
                </span>
              ) : (
                <Badge variant="outline">Not included</Badge>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white/70 p-4 text-sm shadow-inner">
            <p className="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Sale Total</span>
              <span>{formatCurrency(totals.overall.sale)}</span>
            </p>
            <p className="flex items-center justify-between text-sm text-slate-600">
              <span>MRP Total</span>
              <span>{formatCurrency(totals.overall.mrp)}</span>
            </p>
            <p className="flex items-center justify-between text-sm text-emerald-600">
              <span>Savings</span>
              <span>
                {formatCurrency(totals.overall.discountAmount)} ({totals.overall.discountPercent >= 10 ? totals.overall.discountPercent.toFixed(0) : totals.overall.discountPercent.toFixed(1)}%)
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default CustomSetupFlow;
