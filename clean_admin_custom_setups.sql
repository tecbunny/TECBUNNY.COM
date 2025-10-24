-- COMPREHENSIVE ADMIN CUSTOM SETUP CLEANUP
-- This script will clean up and standardize the custom setup components
-- to show only the 11 essential categories with proper MRP and Sale prices

-- =============================================================================
-- STEP 1: Clean up existing excess components and options
-- =============================================================================

DO $$ 
DECLARE
  tmpl_id uuid;
  dvr_system_id uuid;
  nvr_system_id uuid;
BEGIN
  -- Get template and system IDs
  SELECT id INTO tmpl_id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup';
  SELECT id INTO dvr_system_id FROM public.custom_setup_systems WHERE template_id = tmpl_id AND slug = 'dvr-system';
  SELECT id INTO nvr_system_id FROM public.custom_setup_systems WHERE template_id = tmpl_id AND slug = 'nvr-system';

  -- Delete all existing component options (clean slate)
  DELETE FROM public.custom_setup_component_options 
  WHERE component_id IN (
    SELECT id FROM public.custom_setup_components 
    WHERE system_id IN (dvr_system_id, nvr_system_id)
  );

  -- Delete all existing components (clean slate)
  DELETE FROM public.custom_setup_components 
  WHERE system_id IN (dvr_system_id, nvr_system_id);

  RAISE NOTICE 'Cleaned up existing components and options';
END $$;

-- =============================================================================
-- STEP 2: Create the 11 essential component categories
-- =============================================================================

DO $$ 
DECLARE
  tmpl_id uuid;
  dvr_system_id uuid;
  nvr_system_id uuid;
  
  -- Component IDs
  comp_dvr uuid;
  comp_smps uuid;
  comp_analog_cam uuid;
  comp_dvr_hdd uuid;
  comp_dvr_cable uuid;
  comp_nvr uuid;
  comp_poe uuid;
  comp_ip_cam uuid;
  comp_nvr_hdd uuid;
  comp_nvr_cable uuid;
  comp_dvr_monitor uuid;
  comp_nvr_monitor uuid;
  comp_installation uuid;
BEGIN
  -- Get template and system IDs
  SELECT id INTO tmpl_id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup';
  SELECT id INTO dvr_system_id FROM public.custom_setup_systems WHERE template_id = tmpl_id AND slug = 'dvr-system';
  SELECT id INTO nvr_system_id FROM public.custom_setup_systems WHERE template_id = tmpl_id AND slug = 'nvr-system';

  -- =============================================================================
  -- DVR SYSTEM COMPONENTS
  -- =============================================================================

  -- 1. DVR Component (4,8,16,32 channels)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'dvr-recorder', 'DVR Recorder', 'Digital Video Recorder for analog cameras',
    true, 1, 1, 1, 'per_unit', 5799, 
    jsonb_build_object('sale_price', 2799), 10
  ) RETURNING id INTO comp_dvr;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    -- 4 Channel DVR Models (2MP and 5MP variants)
    (comp_dvr, '4 Channel DVR (2MP Model)', 'dvr-4ch-2mp', '4 channel digital video recorder supporting up to 2MP resolution', 5199, true, jsonb_build_object('channel_count', 4, 'model', '2MP', 'max_resolution', '2MP', 'sale_price', 2499)),
    (comp_dvr, '4 Channel DVR (5MP Model)', 'dvr-4ch-5mp', '4 channel digital video recorder supporting up to 5MP resolution', 5799, false, jsonb_build_object('channel_count', 4, 'model', '5MP', 'max_resolution', '5MP', 'sale_price', 2799)),
    -- Single model for other capacities
    (comp_dvr, '8 Channel DVR', 'dvr-8ch', '8 channel digital video recorder', 6699, false, jsonb_build_object('channel_count', 8, 'sale_price', 3799)),
    (comp_dvr, '16 Channel DVR', 'dvr-16ch', '16 channel digital video recorder', 19999, false, jsonb_build_object('channel_count', 16, 'sale_price', 6999)),
    (comp_dvr, '32 Channel DVR', 'dvr-32ch', '32 channel digital video recorder', 32999, false, jsonb_build_object('channel_count', 32, 'sale_price', 13999));

  -- 2. SMPS Component (4,8,16 channel capacity)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'smps-power', 'SMPS Power Supply', 'Switch Mode Power Supply for cameras',
    true, 1, 1, 1, 'per_unit', 1999,
    jsonb_build_object('sale_price', 1249), 20
  ) RETURNING id INTO comp_smps;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_smps, '12V 5A SMPS (4 Channel)', 'smps-5a', 'Power supply for up to 4 cameras', 1999, true, jsonb_build_object('capacity_cameras', 4, 'sale_price', 1249)),
    (comp_smps, '12V 10A SMPS (8 Channel)', 'smps-10a', 'Power supply for up to 8 cameras', 2699, false, jsonb_build_object('capacity_cameras', 8, 'sale_price', 1699)),
    (comp_smps, '12V 20A SMPS (16 Channel)', 'smps-20a', 'Power supply for up to 16 cameras', 3999, false, jsonb_build_object('capacity_cameras', 16, 'sale_price', 2599));

  -- 3. Analog Camera Component (Standard IR: 2.4MP, 5MP)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'analog-camera', 'Analog Camera', 'Analog CCTV cameras for DVR system',
    true, 1, 32, 4, 'per_unit', 1899,
    jsonb_build_object('sale_price', 1299), 30
  ) RETURNING id INTO comp_analog_cam;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    -- Standard IR Options
    (comp_analog_cam, '2.4 MP Standard IR Analog Camera', 'analog-2_4mp-standard', 'Weather resistant analog camera with IR night vision', 1899, true, jsonb_build_object('megapixels', '2.4', 'dual_light', false, 'sale_price', 1299)),
    (comp_analog_cam, '5 MP Standard IR Analog Camera', 'analog-5mp-standard', 'High definition analog camera with IR night vision', 2499, false, jsonb_build_object('megapixels', '5', 'dual_light', false, 'sale_price', 1799)),
    -- Dual Light Options  
    (comp_analog_cam, '2.4 MP Dual-light Analog Camera', 'analog-2_4mp-dual', 'Weather resistant analog camera with dual-light technology', 2199, false, jsonb_build_object('megapixels', '2.4', 'dual_light', true, 'sale_price', 1499)),
    (comp_analog_cam, '5 MP Dual-light Analog Camera', 'analog-5mp-dual', 'High definition analog camera with dual-light technology', 2899, false, jsonb_build_object('megapixels', '5', 'dual_light', true, 'sale_price', 2149));

  -- 4. DVR Storage (HDD: 500GB, 1TB, 2TB)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'dvr-storage', 'DVR Storage', 'Hard disk drive for video storage',
    true, 1, 1, 1, 'per_unit', 4999,
    jsonb_build_object('sale_price', 3799), 40
  ) RETURNING id INTO comp_dvr_hdd;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_dvr_hdd, 'Surveillance HDD 500 GB', 'hdd-500gb', 'Budget drive for short retention', 3499, false, jsonb_build_object('capacity_tb', 0.5, 'sale_price', 2699)),
    (comp_dvr_hdd, 'Surveillance HDD 1 TB', 'hdd-1tb', 'Standard drive for medium retention', 4999, true, jsonb_build_object('capacity_tb', 1, 'sale_price', 3799)),
    (comp_dvr_hdd, 'Surveillance HDD 2 TB', 'hdd-2tb', 'High capacity drive for long retention', 7999, false, jsonb_build_object('capacity_tb', 2, 'sale_price', 5999));

  -- 5. DVR Cable (Coaxial Cable for analog cameras)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'coaxial-cable', 'Coaxial Cable', 'Cable for connecting analog cameras to DVR',
    true, 1, 10, 1, 'per_unit', 3199,
    jsonb_build_object('coverage_meters', 100, 'sale_price', 2499), 50
  ) RETURNING id INTO comp_dvr_cable;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_dvr_cable, 'CCTV Coaxial Cable (100m Roll)', 'cable-coaxial-100m', '100 meter roll of coaxial cable for analog cameras', 3199, true, jsonb_build_object('coverage_meters', 100, 'cable_type', 'coaxial', 'sale_price', 2499));

  -- =============================================================================
  -- NVR SYSTEM COMPONENTS  
  -- =============================================================================

  -- 5. NVR Component (8,16,32 channels)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'nvr-recorder', 'NVR Recorder', 'Network Video Recorder for IP cameras',
    true, 1, 1, 1, 'per_unit', 8999,
    jsonb_build_object('sale_price', 5499), 10
  ) RETURNING id INTO comp_nvr;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr, '8 Channel NVR', 'nvr-8ch', '8 channel network video recorder', 8999, true, jsonb_build_object('channel_count', 8, 'sale_price', 5499)),
    (comp_nvr, '16 Channel NVR', 'nvr-16ch', '16 channel network video recorder', 12999, false, jsonb_build_object('channel_count', 16, 'sale_price', 7899)),
    (comp_nvr, '32 Channel NVR', 'nvr-32ch', '32 channel network video recorder', 18999, false, jsonb_build_object('channel_count', 32, 'sale_price', 11499));

  -- 6. POE Switch Component (8,16 ports)  
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'poe-switch', 'POE Switch', 'Power over Ethernet switch for IP cameras',
    true, 1, 1, 1, 'per_unit', 4999,
    jsonb_build_object('sale_price', 3199), 20
  ) RETURNING id INTO comp_poe;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_poe, '8 Port POE Switch', 'poe-8port', '8 POE ports for IP cameras', 4999, true, jsonb_build_object('poe_ports', 8, 'sale_price', 3199)),
    (comp_poe, '16 Port POE Switch', 'poe-16port', '16 POE ports for IP cameras', 6999, false, jsonb_build_object('poe_ports', 16, 'sale_price', 4499));

  -- 7. IP Camera Component (IR: 2MP, 4MP + Dual Light: 2MP, 4MP)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'ip-camera', 'IP Camera', 'Network IP cameras for NVR system',
    true, 1, 32, 4, 'per_unit', 3299,
    jsonb_build_object('sale_price', 2399), 30
  ) RETURNING id INTO comp_ip_cam;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    -- Standard IR Options
    (comp_ip_cam, '2 MP Standard IR IP Camera', 'ip-2mp-standard', 'PoE dome camera with IR night vision', 3299, true, jsonb_build_object('megapixels', '2', 'dual_light', false, 'sale_price', 2399)),
    (comp_ip_cam, '4 MP Standard IR IP Camera', 'ip-4mp-standard', 'Outdoor bullet camera with IR night vision', 4199, false, jsonb_build_object('megapixels', '4', 'dual_light', false, 'sale_price', 2999)),
    -- Dual Light Options
    (comp_ip_cam, '2 MP Dual-light IP Camera', 'ip-2mp-dual', 'PoE dome camera with dual-light technology', 3699, false, jsonb_build_object('megapixels', '2', 'dual_light', true, 'sale_price', 2699)),
    (comp_ip_cam, '4 MP Dual-light IP Camera', 'ip-4mp-dual', 'Outdoor bullet camera with dual-light technology', 4899, false, jsonb_build_object('megapixels', '4', 'dual_light', true, 'sale_price', 3699));

  -- 8. NVR Storage (HDD: 500GB, 1TB, 2TB)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'nvr-storage', 'NVR Storage', 'Hard disk drive for video storage',
    true, 1, 1, 1, 'per_unit', 4999,
    jsonb_build_object('sale_price', 3799), 40
  ) RETURNING id INTO comp_nvr_hdd;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr_hdd, 'Surveillance HDD 500 GB', 'nvr-hdd-500gb', 'Budget drive for short retention', 3499, false, jsonb_build_object('capacity_tb', 0.5, 'sale_price', 2699)),
    (comp_nvr_hdd, 'Surveillance HDD 1 TB', 'nvr-hdd-1tb', 'Standard drive for medium retention', 4999, true, jsonb_build_object('capacity_tb', 1, 'sale_price', 3799)),
    (comp_nvr_hdd, 'Surveillance HDD 2 TB', 'nvr-hdd-2tb', 'High capacity drive for long retention', 7999, false, jsonb_build_object('capacity_tb', 2, 'sale_price', 5999));

  -- 9. NVR Cable (LAN Cable for IP cameras)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'lan-cable', 'LAN Cable', 'Cable for connecting IP cameras to NVR/POE switch',
    true, 1, 10, 1, 'per_unit', 3399,
    jsonb_build_object('coverage_meters', 100, 'sale_price', 2699), 50
  ) RETURNING id INTO comp_nvr_cable;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr_cable, 'LAN Cable (100m Box)', 'cable-lan-100m', '100 meter box of LAN cable for IP cameras', 3399, true, jsonb_build_object('coverage_meters', 100, 'cable_type', 'lan', 'sale_price', 2699));

  -- =============================================================================
  -- SHARED COMPONENTS (both systems)
  -- =============================================================================

  -- 9. Monitor Component (DVR System)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'surveillance-monitor', 'Surveillance Monitor', 'Optional display for live monitoring',
    false, 0, 1, 0, 'per_unit', 9999,
    jsonb_build_object('notes', 'Optional addon', 'sale_price', 7499), 70
  ) RETURNING id INTO comp_dvr_monitor;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_dvr_monitor, '19" Surveillance Monitor', 'monitor-19', 'Professional surveillance monitor with 24-hour operation rating', 9999, true, jsonb_build_object('size_inches', 19, 'sale_price', 7499));

  -- 10. Monitor Component (NVR System)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'surveillance-monitor', 'Surveillance Monitor', 'Optional display for live monitoring',
    false, 0, 1, 0, 'per_unit', 9999,
    jsonb_build_object('notes', 'Optional addon', 'sale_price', 7499), 70
  ) RETURNING id INTO comp_nvr_monitor;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr_monitor, '19" Surveillance Monitor', 'nvr-monitor-19', 'Professional surveillance monitor with 24-hour operation rating', 9999, true, jsonb_build_object('size_inches', 19, 'sale_price', 7499));

  -- 11. Installation Service Component (shared - adding to both systems)
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id, 'installation-service', 'Installation Service', 'Professional installation and configuration',
    false, 0, 1, 1, 'per_unit', 4500,
    jsonb_build_object('notes', 'Recommended service', 'sale_price', 4500), 80
  ) RETURNING id INTO comp_installation;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_installation, 'On-site Installation & Configuration', 'installation-full', 'Complete setup including mounting, wiring, and configuration', 4500, true, jsonb_build_object('service_type', 'full', 'sale_price', 4500));

  -- Add installation to NVR system as well
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id, 'installation-service', 'Installation Service', 'Professional installation and configuration',
    false, 0, 1, 1, 'per_unit', 4500,
    jsonb_build_object('notes', 'Recommended service', 'sale_price', 4500), 80
  ) RETURNING id INTO comp_installation;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_installation, 'On-site Installation & Configuration', 'nvr-installation-full', 'Complete setup including mounting, wiring, and configuration', 4500, true, jsonb_build_object('service_type', 'full', 'sale_price', 4500));

  RAISE NOTICE 'Successfully created all 11 essential component categories with proper MRP and Sale prices';
END $$;

-- =============================================================================
-- STEP 3: Verification queries (optional - run to verify setup)
-- =============================================================================

-- Check component counts
SELECT 
  s.name as system_name,
  COUNT(c.id) as component_count
FROM public.custom_setup_systems s
LEFT JOIN public.custom_setup_components c ON s.id = c.system_id
WHERE s.template_id = (SELECT id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup')
GROUP BY s.id, s.name;

-- Check all components with their option counts
SELECT 
  s.name as system_name,
  c.name as component_name,
  COUNT(o.id) as options_count
FROM public.custom_setup_systems s
JOIN public.custom_setup_components c ON s.id = c.system_id
LEFT JOIN public.custom_setup_component_options o ON c.id = o.component_id
WHERE s.template_id = (SELECT id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup')
GROUP BY s.id, s.name, c.id, c.name, c.sort_order
ORDER BY s.name, c.sort_order;

-- Check pricing integrity (ensure MRP >= Sale Price)
SELECT 
  c.name as component_name,
  o.label as option_name,
  o.unit_price as mrp,
  (o.metadata->>'sale_price')::numeric as sale_price,
  CASE 
    WHEN o.unit_price >= (o.metadata->>'sale_price')::numeric THEN 'OK'
    ELSE 'ERROR: Sale > MRP'
  END as pricing_status
FROM public.custom_setup_components c
JOIN public.custom_setup_component_options o ON c.id = o.component_id
WHERE c.system_id IN (
  SELECT id FROM public.custom_setup_systems 
  WHERE template_id = (SELECT id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup')
)
ORDER BY c.sort_order, o.label;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- This script creates exactly 11 component categories:
-- 
-- DVR SYSTEM:
-- 1. DVR (4CH: 2MP/5MP models, 8CH, 16CH, 32CH single models)
-- 2. SMPS (4,8,16 channel capacity) 
-- 3. Analog Camera Standard IR (2.4MP, 5MP)
-- 4. Analog Camera Dual Light (2.4MP, 5MP) [same component, different options]
-- 5. DVR Storage HDD (500GB, 1TB, 2TB)
-- 6. Coaxial Cable (100m roll)
-- 7. Monitor (19")
-- 8. Installation Service
--
-- NVR SYSTEM:
-- 9. NVR (8,16,32 channels)
-- 10. POE Switch (8,16 ports)
-- 11. IP Camera Standard IR (2MP, 4MP)
-- 12. IP Camera Dual Light (2MP, 4MP) [same component, different options]
-- 13. NVR Storage HDD (500GB, 1TB, 2TB)  
-- 14. LAN Cable (100m box)
-- 15. Monitor (19")
-- 16. Installation Service
--
-- All components have proper MRP >= Sale Price
-- All prices include proper sale_price metadata
-- Clean, organized structure for admin portal
-- =============================================================================