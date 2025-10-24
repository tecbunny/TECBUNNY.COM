-- Add sale prices to custom setup component options metadata
-- This migration adds sale_price metadata to match the expected pricing structure

DO $$ 
BEGIN
  -- DVR sale prices (maintain original fallback discounts)
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 2799)
  WHERE value = 'dvr-4ch';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 3799)
  WHERE value = 'dvr-8ch';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 6999)
  WHERE value = 'dvr-16ch';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 13999)
  WHERE value = 'dvr-32ch';

  -- Analog camera sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 1299)
  WHERE value = 'analog-2_4mp';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 1799)
  WHERE value = 'analog-5mp';

  -- SMPS sale prices  
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 1249)
  WHERE value = 'smps-5a';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 1699)
  WHERE value = 'smps-10a';

  -- Coaxial cable sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 2499)
  WHERE value = 'coax-100m';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 4599)
  WHERE value = 'coax-200m';

  -- HDD sale prices (DVR storage)
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 2699)
  WHERE value = 'hdd-500gb-refurb';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 3399)
  WHERE value = 'hdd-1tb';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 4699)
  WHERE value = 'hdd-2tb';

  -- NVR sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 5499)
  WHERE value = 'nvr-8ch';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 7899)
  WHERE value = 'nvr-16ch';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 11499)
  WHERE value = 'nvr-32ch';

  -- IP camera sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 2399)
  WHERE value = 'ip-2mp';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 3199)
  WHERE value = 'ip-4mp';

  -- PoE switch sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 3199)
  WHERE value = 'poe-8-2';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 4499)
  WHERE value = 'poe-16-2';

  -- LAN cable sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 2799)
  WHERE value = 'lan-100m';

  -- NVR HDD sale prices
  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 3399)
  WHERE value = 'nvr-hdd-1tb';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 4699)
  WHERE value = 'nvr-hdd-2tb';

  UPDATE public.custom_setup_component_options 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('sale_price', 7999)
  WHERE value = 'nvr-hdd-4tb';

  RAISE NOTICE 'Added sale_price metadata to all custom setup component options.';
END $$;