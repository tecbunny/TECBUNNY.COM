-- Add missing component options to match fallback pricing structure
-- This ensures all expected options are available in the database

DO $$ 
DECLARE
  comp_analog_cam uuid;
  comp_smps uuid;
  comp_dvr_hdd uuid;
  comp_poe uuid;
  comp_nvr_hdd uuid;
  comp_ip_cam uuid;
  tmpl_id uuid;
  dvr_system_id uuid;
  nvr_system_id uuid;
  comp_monitor uuid;
BEGIN
  -- Get template and system IDs
  SELECT id INTO tmpl_id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup';
  SELECT id INTO dvr_system_id FROM public.custom_setup_systems WHERE template_id = tmpl_id AND slug = 'dvr-system';
  SELECT id INTO nvr_system_id FROM public.custom_setup_systems WHERE template_id = tmpl_id AND slug = 'nvr-system';

  -- Get component IDs
  SELECT id INTO comp_analog_cam FROM public.custom_setup_components WHERE system_id = dvr_system_id AND slug = 'analog-camera';
  SELECT id INTO comp_smps FROM public.custom_setup_components WHERE system_id = dvr_system_id AND slug = 'smps-power';
  SELECT id INTO comp_dvr_hdd FROM public.custom_setup_components WHERE system_id = dvr_system_id AND slug = 'dvr-storage';
  SELECT id INTO comp_poe FROM public.custom_setup_components WHERE system_id = nvr_system_id AND slug = 'poe-switch';
  SELECT id INTO comp_nvr_hdd FROM public.custom_setup_components WHERE system_id = nvr_system_id AND slug = 'nvr-storage';
  SELECT id INTO comp_ip_cam FROM public.custom_setup_components WHERE system_id = nvr_system_id AND slug = 'ip-camera';

  -- Add missing analog camera dual-light options
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_analog_cam, '2.4 MP Dual-light Analog Camera', 'analog-2_4mp-dual', 'Weather resistant analog camera with dual-light technology.', 2199, false, jsonb_build_object('megapixels', '2.4', 'dual_light', true, 'sale_price', 1499)),
    (comp_analog_cam, '5 MP Dual-light Analog Camera', 'analog-5mp-dual', 'High definition analog camera with dual-light technology.', 2899, false, jsonb_build_object('megapixels', '5', 'dual_light', true, 'sale_price', 2149));

  -- Add missing SMPS option for 16 channels
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_smps, '12V 20A SMPS', 'smps-20a', 'High capacity SMPS for up to 16 cameras.', 3999, false, jsonb_build_object('capacity_cameras', 16, 'sale_price', 2599));

  -- Add missing PoE option for 32 ports
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_poe, '32+4 Port POE Switch', 'poe-32-4', '32 POE ports + 4 uplinks.', 10999, false, jsonb_build_object('poe_ports', 32, 'sale_price', 6999));

  -- Add missing IP camera dual-light options
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_ip_cam, '2 MP Dual-light IP Camera', 'ip-2mp-dual', 'PoE dome camera with dual-light technology.', 3699, false, jsonb_build_object('megapixels', '2', 'dual_light', true, 'sale_price', 2699)),
    (comp_ip_cam, '4 MP Dual-light IP Camera', 'ip-4mp-dual', 'Outdoor bullet camera with dual-light technology.', 4899, false, jsonb_build_object('megapixels', '4', 'dual_light', true, 'sale_price', 3699));

  -- Add missing HDD option (500GB for both systems)
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_dvr_hdd, 'Surveillance HDD 500 GB', 'hdd-500gb', 'Budget drive for short retention.', 3499, false, jsonb_build_object('capacity_tb', 0.5, 'sale_price', 2699));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr_hdd, 'Surveillance HDD 500 GB', 'nvr-hdd-500gb', 'Budget drive for short retention.', 3499, false, jsonb_build_object('capacity_tb', 0.5, 'sale_price', 2699));

  -- Add monitor component to both systems
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'surveillance-monitor',
    'Surveillance Monitor',
    'Optional display for live monitoring.',
    false,
    0,
    1,
    0,
    'per_unit',
    9999,
    jsonb_build_object('notes', 'Optional addon', 'sale_price', 7499),
    70
  ) RETURNING id INTO comp_monitor;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_monitor, '24" Surveillance Monitor', 'monitor-24', 'Professional surveillance monitor with 24-hour operation rating.', 9999, true, jsonb_build_object('size_inches', 24, 'sale_price', 7499));

  -- Add monitor component to NVR system
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'surveillance-monitor',
    'Surveillance Monitor', 
    'Optional display for live monitoring.',
    false,
    0,
    1,
    0,
    'per_unit',
    9999,
    jsonb_build_object('notes', 'Optional addon', 'sale_price', 7499),
    70
  ) RETURNING id INTO comp_monitor;

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_monitor, '24" Surveillance Monitor', 'nvr-monitor-24', 'Professional surveillance monitor with 24-hour operation rating.', 9999, true, jsonb_build_object('size_inches', 24, 'sale_price', 7499));

  RAISE NOTICE 'Added missing component options and monitor components.';
END $$;