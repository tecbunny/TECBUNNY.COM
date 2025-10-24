'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { RefreshCw, Save, Settings2 } from 'lucide-react';

import CustomSetupFlow from '@/components/customised-setups/CustomSetupFlow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_CUSTOM_SETUP_TEMPLATE_SLUG } from '@/lib/custom-setup.constants';
import {
  type CustomSetupBlueprintSummary,
  type CustomSetupBlueprintSystemSummary,
  type JsonRecord,
} from '@/lib/custom-setup-service';
import { logger } from '@/lib/logger';

interface TemplateListItem {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  is_active?: boolean | null;
  base_price?: number | null;
  currency?: string | null;
}

interface AdminTemplateResponse {
  template: {
    id: string;
    slug: string;
    name: string;
    currency?: string | null;
    systems?: Array<CustomSetupBlueprintSystemSummary & {
      components?: Array<CustomSetupBlueprintSystemSummary['components'][number] & {
        options?: CustomSetupBlueprintSystemSummary['components'][number]['options'];
      }>;
    }>;
  };
  summary: CustomSetupBlueprintSummary | null;
}

type PricingDraftState = Record<string, string>;

type PendingOptionChange = {
  unitPrice?: number | null;
  metadata?: JsonRecord | null;
};

type PendingOptionState = Record<string, PendingOptionChange>;

type OptionUpdateRequest = {
  target: 'option';
  id: string;
  unitPrice?: number | null;
  metadata?: JsonRecord | null;
};

type SelectionDraft = {
  componentDefaultQuantities: Record<string, string>;
  systemBaseFees: Record<string, string>;
};

const SALE_PRICE_KEY = 'sale_price';

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractSalePrice(metadata: JsonRecord | null | undefined): number | null {
  if (!metadata) {
    return null;
  }

  const rawSale = metadata[SALE_PRICE_KEY];

  if (typeof rawSale === 'number' && Number.isFinite(rawSale)) {
    return roundToTwoDecimals(rawSale);
  }

  if (typeof rawSale === 'string' && rawSale.trim().length > 0) {
    const parsed = Number.parseFloat(rawSale);
    if (Number.isFinite(parsed)) {
      return roundToTwoDecimals(parsed);
    }
  }

  return null;
}

function cloneMetadata(metadata: JsonRecord | null | undefined): JsonRecord | null {
  if (!metadata) {
    return null;
  }

  return { ...metadata };
}

function normalizeMetadata(metadata: JsonRecord | null | undefined): JsonRecord | null {
  if (!metadata) {
    return null;
  }

  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return null;
  }

  return Object.fromEntries(entries) as JsonRecord;
}

function metadataEquals(a: JsonRecord | null | undefined, b: JsonRecord | null | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function parseNumericMetadata(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function ensureNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeCableLength(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }
  const rounded = Math.round(value / 100) * 100;
  return Math.min(5000, Math.max(100, rounded));
}

function readNumericMetadata(meta: JsonRecord | null | undefined, key: string): number | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  return parseNumericMetadata((meta as Record<string, unknown>)[key]);
}

function readStringMetadata(meta: JsonRecord | null | undefined, key: string): string | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const raw = (meta as Record<string, unknown>)[key];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
}

const SALE_PRICE_METADATA_KEYS = ['sale_price', 'salePrice', 'offer_price', 'offerPrice', 'discounted_price', 'discountedPrice'];
const DISCOUNT_PERCENT_METADATA_KEYS = [
  'discount_percent',
  'discount_percentage',
  'discountPercent',
  'discountPercentage',
  'sale_discount_percent',
  'saleDiscountPercent',
];
const SALE_FORMULA_METADATA_KEYS = ['sale_formula', 'saleFormula'];

const DEFAULT_CUSTOM_SETUP_DISCOUNT_PERCENT = (() => {
  const raw = Number.parseFloat(process.env.NEXT_PUBLIC_CUSTOM_SETUP_DISCOUNT_PERCENT ?? '');
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return 12;
})();

function applyDiscountPercent(amount: number, percent: number | null): number {
  if (percent === null || !Number.isFinite(percent)) {
    return amount;
  }
  const normalizedPercent = percent > 0 && percent < 1 ? percent * 100 : percent;
  const discounted = amount - (amount * normalizedPercent) / 100;
  return Math.max(0, discounted);
}

function readNumericMetadataWithFallback(meta: JsonRecord | null | undefined, keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumericMetadata(meta, key);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function readStringMetadataWithFallback(meta: JsonRecord | null | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const value = readStringMetadata(meta, key);
    if (value) {
      return value;
    }
  }
  return null;
}

function evaluateFormula(expression: string | null | undefined, context: Record<string, number>): number {
  if (!expression || !/^[0-9a-zA-Z_+\-*/().\s]*$/.test(expression)) {
    return 0;
  }

  try {
    const keys = Object.keys(context);
    const values = keys.map((key) => context[key]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return ${expression};`);
    const result = fn(...values);
    return Number.isFinite(result) ? Number(result) : 0;
  } catch (_error) {
    return 0;
  }
}

function getSelectedOption(
  component: CustomSetupBlueprintSystemSummary['components'][number],
  selectedOptionId: string | undefined
) {
  if (!component.options.length) {
    return null;
  }

  const match = component.options.find((option) => option.id === selectedOptionId);
  if (match) {
    return match;
  }

  return component.options.find((option) => option.isDefault) ?? component.options[0] ?? null;
}

function calculateComponentTotalsForPricing(
  component: CustomSetupBlueprintSystemSummary['components'][number],
  selectedOptionId: string | undefined,
  context: { cameraCount: number; cableLength: number },
  fallbackDiscountPercent: number | null,
  overrides: { mrp: number | null; sale: number | null }
): { sale: number; mrp: number } {
  const option = getSelectedOption(component, selectedOptionId);
  const optionSaleMetadata = readNumericMetadataWithFallback(option?.metadata ?? null, SALE_PRICE_METADATA_KEYS);
  const baseUnitPrice = option?.unitPrice ?? component.unitPrice ?? component.basePrice ?? 0;
  const unitPrice = overrides.mrp !== null ? overrides.mrp : baseUnitPrice;
  const basePrice = component.basePrice ?? 0;
  const componentSalePrice = readNumericMetadataWithFallback(component.metadata ?? null, SALE_PRICE_METADATA_KEYS);
  const saleFormula = readStringMetadataWithFallback(component.metadata ?? null, SALE_FORMULA_METADATA_KEYS);
  const optionDiscountPercent = readNumericMetadataWithFallback(option?.metadata ?? null, DISCOUNT_PERCENT_METADATA_KEYS);
  const componentDiscountPercent = readNumericMetadataWithFallback(component.metadata ?? null, DISCOUNT_PERCENT_METADATA_KEYS);
  const discountPercent = optionDiscountPercent ?? componentDiscountPercent ?? fallbackDiscountPercent;

  const overrideSale = overrides.sale !== null ? Math.min(overrides.sale, unitPrice) : null;
  const salePrice = overrideSale ?? optionSaleMetadata;

  const evaluate = (expression: string | null | undefined): number => {
    return Math.max(0, evaluateFormula(expression, {
      camera_count: context.cameraCount,
      total_cable_length_m: context.cableLength,
    }));
  };

  if (component.pricingMode === 'formula') {
    const mrpValue = evaluate(component.pricingFormula ?? null);
    const normalizedMrp = Math.max(0, mrpValue);
    const saleValue = saleFormula
      ? evaluate(saleFormula)
      : (componentSalePrice ?? applyDiscountPercent(normalizedMrp, discountPercent));
    const normalizedSale = Math.max(0, Math.min(saleValue, normalizedMrp));
    return {
      sale: normalizedSale,
      mrp: normalizedMrp,
    };
  }

  if (component.pricingMode === 'fixed') {
    const resolvedMrp = unitPrice ?? basePrice;
    const normalizedMrp = Math.max(0, resolvedMrp);
    const saleCandidate = salePrice ?? componentSalePrice ?? applyDiscountPercent(normalizedMrp, discountPercent);
    const normalizedSale = Math.max(0, Math.min(saleCandidate, normalizedMrp));
    return {
      sale: normalizedSale,
      mrp: normalizedMrp,
    };
  }

  let quantity = component.defaultQuantity ?? 1;

  switch (component.slug) {
    case 'analog-camera':
    case 'ip-camera':
      quantity = Math.max(1, Math.round(context.cameraCount));
      break;
    case 'smps-power':
      quantity = Math.max(1, Math.ceil(context.cameraCount / 4));
      break;
    case 'poe-switch':
      quantity = Math.max(1, Math.ceil(context.cameraCount / 8));
      break;
    case 'coaxial-cable':
    case 'cat6-cable': {
      const coverage = readNumericMetadata(option?.metadata ?? null, 'coverage_m') ?? 100;
      quantity = Math.max(1, Math.ceil(context.cableLength / coverage));
      break;
    }
    case 'installation-service': {
      const value = evaluate(component.pricingFormula ?? '0');
      return { sale: value, mrp: value };
    }
    default:
      if (component.quantityVariable === 'camera_count') {
        quantity = Math.max(1, Math.round(context.cameraCount));
      }
      break;
  }

  const effectiveSaleUnit = salePrice ?? componentSalePrice ?? applyDiscountPercent(unitPrice, discountPercent);
  const totalSale = Math.max(0, quantity * effectiveSaleUnit + basePrice);
  const totalMrp = Math.max(0, quantity * unitPrice + basePrice);
  const normalizedMrp = Math.max(0, totalMrp);
  const normalizedSale = Math.max(0, Math.min(totalSale, normalizedMrp));

  return { sale: normalizedSale, mrp: normalizedMrp };
}

export default function AdminCustomSetupManager() {
  const { toast } = useToast();
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<CustomSetupBlueprintSummary | null>(null);
  const [templateCurrency, setTemplateCurrency] = useState<string>('INR');
  const [pricingDraft, setPricingDraft] = useState<PricingDraftState>({});
  const [salePricingDraft, setSalePricingDraft] = useState<PricingDraftState>({});
  const [pendingOptionUpdates, setPendingOptionUpdates] = useState<PendingOptionState>({});
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft>({
    componentDefaultQuantities: {},
    systemBaseFees: {},
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/admin/custom-setups');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load custom setup templates');
      }

      setTemplates(result.data || []);

      if (!selectedSlug) {
  const defaultTemplate = (result.data || []).find((item: TemplateListItem) => item.slug === DEFAULT_CUSTOM_SETUP_TEMPLATE_SLUG);
        if (defaultTemplate) {
          setSelectedSlug(defaultTemplate.slug);
        } else if ((result.data || []).length > 0) {
          setSelectedSlug(result.data[0].slug);
        }
      }
    } catch (error) {
      logger.error('admin_custom_setup_manager.load_templates_failed', { error });
      toast({
        variant: 'destructive',
        title: 'Failed to load templates',
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedSlug, toast]);

  const fetchTemplateDetails = useCallback(async (slug: string) => {
    if (!slug) {
      setBlueprint(null);
      setPricingDraft({});
      setSalePricingDraft({});
      setPendingOptionUpdates({});
      return;
    }

    setTemplateLoading(true);
    try {
      const response = await fetch(`/api/admin/custom-setups?slug=${encodeURIComponent(slug)}`);
      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to load template details');
      }

      const { summary } = result.data as AdminTemplateResponse;
      setBlueprint(summary);
      setTemplateCurrency(summary?.currency || 'INR');

      const optionDraft: PricingDraftState = {};
      const saleDraft: PricingDraftState = {};
      const defaultQuantities: Record<string, string> = {};
      const baseFees: Record<string, string> = {};

      summary?.systems.forEach((system) => {
        if (system.baseFee !== null && system.baseFee !== undefined) {
          baseFees[system.id] = system.baseFee.toString();
        }
        system.components.forEach((component) => {
          if (component.defaultQuantity !== null && component.defaultQuantity !== undefined) {
            defaultQuantities[component.id] = component.defaultQuantity.toString();
          }
          component.options.forEach((option) => {
            optionDraft[option.id] = option.unitPrice !== null && option.unitPrice !== undefined
              ? option.unitPrice.toString()
              : '';
            const salePrice = extractSalePrice(option.metadata ?? null);
            saleDraft[option.id] = salePrice !== null ? salePrice.toString() : '';
          });
        });
      });

      setPricingDraft(optionDraft);
      setSalePricingDraft(saleDraft);
      setPendingOptionUpdates({});
      setSelectionDraft({
        componentDefaultQuantities: defaultQuantities,
        systemBaseFees: baseFees,
      });
    } catch (error) {
      logger.error('admin_custom_setup_manager.load_template_failed', { slug, error });
      toast({
        variant: 'destructive',
        title: 'Failed to load template',
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
      setBlueprint(null);
      setPricingDraft({});
      setSalePricingDraft({});
      setPendingOptionUpdates({});
    } finally {
      setTemplateLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (selectedSlug) {
      fetchTemplateDetails(selectedSlug);
    }
  }, [selectedSlug, fetchTemplateDetails]);

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: templateCurrency || 'INR',
    maximumFractionDigits: 2,
  }), [templateCurrency]);

  const handleOptionPriceChange = (optionId: string, value: string, originalPrice: number | null) => {
    setPricingDraft((previous) => ({ ...previous, [optionId]: value }));

    const trimmed = value.trim();
    const isBlank = trimmed.length === 0;
    const parsed = Number.parseFloat(value);
    const normalized = isBlank ? null : Number.isNaN(parsed) ? undefined : roundToTwoDecimals(parsed);

    setPendingOptionUpdates((previous) => {
  const next = { ...previous };
  const currentChange: PendingOptionChange = { ...(previous[optionId] ?? {}) };

      if (normalized === undefined) {
        delete currentChange.unitPrice;
      } else if (normalized === null) {
        if (originalPrice !== null) {
          currentChange.unitPrice = null;
        } else {
          delete currentChange.unitPrice;
        }
      } else if (originalPrice === null || Math.abs(normalized - originalPrice) > 0.009) {
        currentChange.unitPrice = normalized;
      } else {
        delete currentChange.unitPrice;
      }

      if (currentChange.unitPrice === undefined && currentChange.metadata === undefined) {
        delete next[optionId];
      } else {
        next[optionId] = currentChange;
      }

      return next;
    });
  };

  const handleOptionSalePriceChange = (
    optionId: string,
    value: string,
    originalMetadata: JsonRecord | null,
  ) => {
    setSalePricingDraft((previous) => ({ ...previous, [optionId]: value }));

    const trimmed = value.trim();
    const isBlank = trimmed.length === 0;
    const parsed = Number.parseFloat(value);
    const normalized = isBlank ? null : Number.isNaN(parsed) ? undefined : roundToTwoDecimals(parsed);
    const originalSalePrice = extractSalePrice(originalMetadata);

    setPendingOptionUpdates((previous) => {
      const next = { ...previous };
      const currentChange: PendingOptionChange = { ...(previous[optionId] ?? {}) };
      const workingBase = currentChange.metadata !== undefined
        ? cloneMetadata(currentChange.metadata)
        : cloneMetadata(originalMetadata);

      const baseMetadata: JsonRecord = workingBase ? { ...workingBase } : {};

      if (normalized === undefined) {
        // Ignore invalid numeric entry, keep current metadata change
        return next;
      }

      if (normalized === null) {
        if (originalSalePrice === null) {
          delete currentChange.metadata;
        } else {
          delete baseMetadata[SALE_PRICE_KEY];
          const normalizedMetadata = normalizeMetadata(baseMetadata);
          if (metadataEquals(normalizedMetadata, originalMetadata)) {
            delete currentChange.metadata;
          } else {
            currentChange.metadata = normalizedMetadata;
          }
        }
      } else if (originalSalePrice === null || Math.abs(normalized - originalSalePrice) > 0.009) {
        baseMetadata[SALE_PRICE_KEY] = normalized;
        const normalizedMetadata = normalizeMetadata(baseMetadata);
        if (metadataEquals(normalizedMetadata, originalMetadata)) {
          delete currentChange.metadata;
        } else {
          currentChange.metadata = normalizedMetadata;
        }
      } else {
        delete currentChange.metadata;
      }

      if (currentChange.unitPrice === undefined && currentChange.metadata === undefined) {
        delete next[optionId];
      } else {
        next[optionId] = currentChange;
      }

      return next;
    });
  };

  const parseDraftCurrency = useCallback((value: string | undefined): number | null => {
    if (!value || !value.trim()) {
      return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? roundToTwoDecimals(parsed) : null;
  }, []);

  const getSystemSummary = useCallback((system: CustomSetupBlueprintSystemSummary) => {
    const cameraVariable = blueprint?.variables.find((variable) => variable.key === 'camera_count');
    const cableVariable = blueprint?.variables.find((variable) => variable.key === 'total_cable_length_m');

    const defaultCameraCount = ensureNumber(cameraVariable?.defaultValue, 4);
    const defaultCableLength = normalizeCableLength(ensureNumber(cableVariable?.defaultValue, 100));
    const context = {
      cameraCount: defaultCameraCount,
      cableLength: defaultCableLength,
    };

    const blueprintDiscountPercent = readNumericMetadataWithFallback(blueprint?.metadata ?? null, DISCOUNT_PERCENT_METADATA_KEYS);
    const systemDiscountPercent = readNumericMetadataWithFallback(system.metadata ?? null, DISCOUNT_PERCENT_METADATA_KEYS);
    const fallbackDiscountPercent = (systemDiscountPercent ?? blueprintDiscountPercent ?? DEFAULT_CUSTOM_SETUP_DISCOUNT_PERCENT) || null;

    let totalMrp = 0;
    let totalSale = 0;

    const baseFee = system.baseFee ?? 0;
    const baseFeeSaleOverride = readNumericMetadataWithFallback(system.metadata ?? null, SALE_PRICE_METADATA_KEYS);
    const baseFeeSale = baseFeeSaleOverride !== null
      ? Math.min(baseFeeSaleOverride, baseFee)
      : applyDiscountPercent(baseFee, fallbackDiscountPercent);

    totalMrp += baseFee;
    totalSale += Math.min(baseFeeSale, baseFee);

    system.components.forEach((component) => {
      const selectedOptionId = component.defaultOption?.id
        ?? component.options.find((option) => option.isDefault)?.id
        ?? component.options[0]?.id;

      const mrpOverride = selectedOptionId ? parseDraftCurrency(pricingDraft[selectedOptionId]) : null;
      const saleOverride = selectedOptionId ? parseDraftCurrency(salePricingDraft[selectedOptionId]) : null;

      const componentTotals = calculateComponentTotalsForPricing(
        component,
        selectedOptionId,
        context,
        fallbackDiscountPercent,
        {
          mrp: mrpOverride,
          sale: saleOverride,
        }
      );

      totalMrp += componentTotals.mrp;
      totalSale += Math.min(componentTotals.sale, componentTotals.mrp);
    });

    totalMrp = Math.max(0, roundToTwoDecimals(totalMrp));
    totalSale = Math.max(0, roundToTwoDecimals(totalSale));
    const discountAmount = Math.max(0, roundToTwoDecimals(totalMrp - totalSale));
    const discountPercent = totalMrp > 0 ? (discountAmount / totalMrp) * 100 : 0;

    return {
      totalMrp,
      totalSale,
      discountAmount,
      discountPercent,
    };
  }, [blueprint, parseDraftCurrency, pricingDraft, salePricingDraft]);

  const pendingOptionCount = Object.values(pendingOptionUpdates).reduce((count, change) => {
    return change.unitPrice !== undefined || change.metadata !== undefined ? count + 1 : count;
  }, 0);

  const handleSavePricing = async () => {
    if (pendingOptionCount === 0) {
      toast({ title: 'No changes detected', description: 'Adjust a price before saving.' });
      return;
    }

    setSaving(true);
    try {
      const updates = Object.entries(pendingOptionUpdates).reduce<OptionUpdateRequest[]>((accumulator, [optionId, change]) => {
        const payload: OptionUpdateRequest = { target: 'option', id: optionId };
        let include = false;

        if (change.unitPrice !== undefined) {
          payload.unitPrice = change.unitPrice;
          include = true;
        }

        if (change.metadata !== undefined) {
          payload.metadata = change.metadata ?? null;
          include = true;
        }

        if (include) {
          accumulator.push(payload);
        }

        return accumulator;
      }, []);

      if (!updates.length) {
        toast({ title: 'No changes detected', description: 'Adjust a price before saving.' });
        return;
      }

      const response = await fetch('/api/admin/custom-setups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save pricing updates');
      }

      toast({
        title: 'Pricing updated',
        description: 'Custom setup option pricing saved successfully.',
      });

      await fetchTemplateDetails(selectedSlug);
    } catch (error) {
      logger.error('admin_custom_setup_manager.save_failed', { error });
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderOptionTable = (system: CustomSetupBlueprintSystemSummary, component: CustomSetupBlueprintSystemSummary['components'][number]) => {
    if (!component.options.length) {
      return (
        <p className="text-sm text-slate-500">No selectable options. Pricing is driven by quantity or formulas.</p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[240px]">Option</TableHead>
            <TableHead className="w-[160px]">MRP (New Price)</TableHead>
            <TableHead className="w-[160px]">Sale Price</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {component.options.map((option) => {
            const draftValue = pricingDraft[option.id] ?? '';
            const saleDraftValue = salePricingDraft[option.id] ?? '';
            const original = option.unitPrice ?? null;
            const originalMetadata = option.metadata ?? null;
            const originalSalePrice = extractSalePrice(originalMetadata);
            const pendingChange = pendingOptionUpdates[option.id];
            const priceDirty = pendingChange?.unitPrice !== undefined;
            const saleDirty = pendingChange?.metadata !== undefined;
            const isDirty = Boolean(priceDirty || saleDirty);
            const rawMegapixels = option.metadata?.megapixels;
            const megapixels = parseNumericMetadata(rawMegapixels);
            const rawCoverage = option.metadata?.coverage_m;
            const coverageMeters = parseNumericMetadata(rawCoverage);
            const rawFormFactor = option.metadata?.form_factor;
            const formFactor = typeof rawFormFactor === 'string' ? rawFormFactor : null;
            const fallbackMrp = original ?? component.unitPrice ?? component.basePrice ?? 0;
            const resolvedMrp = parseDraftCurrency(draftValue) ?? fallbackMrp;
            const resolvedSale = Math.min(
              parseDraftCurrency(saleDraftValue) ?? originalSalePrice ?? resolvedMrp,
              resolvedMrp
            );
            const optionDiscountAmount = Math.max(0, resolvedMrp - resolvedSale);
            const optionDiscountPercent = resolvedMrp > 0 ? (optionDiscountAmount / resolvedMrp) * 100 : 0;

            return (
              <TableRow key={option.id} className={isDirty ? 'bg-primary/5' : undefined}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-800">{option.label}</span>
                    {megapixels !== null && (
                      <span className="text-xs text-slate-500">Resolution: {megapixels} MP</span>
                    )}
                    {coverageMeters !== null && (
                      <span className="text-xs text-slate-500">Coverage: {coverageMeters} m</span>
                    )}
                    {formFactor && (
                      <span className="text-xs text-slate-500">Type: {formFactor}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draftValue}
                    onChange={(event) => handleOptionPriceChange(option.id, event.target.value, original)}
                    className={priceDirty ? 'border-primary' : undefined}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={saleDraftValue}
                      onChange={(event) => handleOptionSalePriceChange(option.id, event.target.value, originalMetadata)}
                      className={saleDirty ? 'border-primary' : undefined}
                    />
                    <span className="text-xs text-slate-500">
                      Discount: {currencyFormatter.format(optionDiscountAmount)} ({optionDiscountPercent.toFixed(1)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {priceDirty && saleDirty && 'Price & sale price pending'}
                  {!priceDirty && saleDirty && 'Sale price pending'}
                  {priceDirty && !saleDirty && 'Price pending'}
                  {!isDirty && '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 max-w-3xl space-y-2">
        <h1 className="text-3xl font-bold">Custom Setup Workspace</h1>
        <p className="text-muted-foreground">
          Manage template pricing and preview the customer-facing estimator without leaving the admin console.
        </p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="w-full max-w-xl justify-start">
          <TabsTrigger value="pricing">Pricing manager</TabsTrigger>
          <TabsTrigger value="preview">Estimator preview</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Template pricing</h2>
                <p className="text-sm text-muted-foreground">
                  Adjust option pricing and fees for configurable bundles such as customised PCs or surveillance packages.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchTemplates} disabled={loadingTemplates}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingTemplates ? 'animate-spin' : ''}`} />
                  Templates
                </Button>
                <Button onClick={handleSavePricing} disabled={pendingOptionCount === 0 || saving}>
                  <Save className={`mr-2 h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                  Save {pendingOptionCount > 0 ? `(${pendingOptionCount})` : ''}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Select Template
                </CardTitle>
                <CardDescription>Choose which configurable bundle you wish to adjust.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => {
                    const isSelected = template.slug === selectedSlug;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedSlug(template.slug)}
                        className={`rounded-lg border p-4 text-left transition-shadow ${
                          isSelected ? 'border-primary shadow-lg' : 'border-slate-200 hover:shadow'
                        }`}
                        disabled={templateLoading && template.slug !== selectedSlug}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">{template.category || 'General'}</span>
                          {template.is_active ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">Slug: {template.slug}</p>
                        {template.base_price !== null && template.base_price !== undefined && (
                          <p className="mt-2 text-sm text-slate-600">
                            Base Price: {currencyFormatter.format(template.base_price)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {templateLoading && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
                    Loading template details...
                  </div>
                </CardContent>
              </Card>
            )}

            {!templateLoading && blueprint && (
              <div className="space-y-6">
                {blueprint.systems.map((system) => {
                  const { totalMrp, totalSale, discountAmount, discountPercent } = getSystemSummary(system);

                  return (
                    <Card key={system.id} className="border-primary/20 shadow-none">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-2xl text-slate-900">{system.name}</CardTitle>
                            {system.description && (
                              <CardDescription>{system.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex flex-wrap items-end gap-3 text-right">
                            <div className="flex items-center gap-3">
                              {system.isDefault && <Badge variant="secondary">Default path</Badge>}
                              {system.baseFee !== null && (
                                <Badge variant="outline">
                                  Base fee: {currencyFormatter.format(system.baseFee)}
                                </Badge>
                              )}
                            </div>
                            <div className="min-w-[190px] rounded-lg bg-primary/5 px-3 py-2 text-sm text-slate-700">
                              <p className="font-semibold text-slate-800">System totals</p>
                              <p>MRP: {currencyFormatter.format(totalMrp)}</p>
                              <p>Sale: {currencyFormatter.format(totalSale)}</p>
                              <p className="text-emerald-600 font-semibold">
                                Savings: {currencyFormatter.format(discountAmount)} ({discountPercent.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {system.components.map((component) => (
                            <div key={component.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">{component.name}</h3>
                                  {component.description && (
                                    <p className="mt-1 text-sm text-slate-600">{component.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                  <Badge variant="outline">{component.isRequired ? 'Required' : 'Optional'}</Badge>
                                  {component.pricingMode && (
                                    <Badge variant="outline">Billing: {component.pricingMode.replace('_', ' ')}</Badge>
                                  )}
                                  {component.quantityVariable && (
                                    <Badge variant="outline">Qty variable: {component.quantityVariable}</Badge>
                                  )}
                                </div>
                              </div>
                              <Separator className="my-4" />
                              {renderOptionTable(system, component)}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!templateLoading && !blueprint && (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  Select a template to manage its pricing.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="border-primary/20 shadow-none">
            <CardHeader>
              <CardTitle>Estimator preview</CardTitle>
              <CardDescription>
                Explore the customer-facing flow using the current blueprint catalogue. Pricing changes saved above
                may require a public deployment before they appear on the live site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomSetupFlow blueprint={blueprint} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
