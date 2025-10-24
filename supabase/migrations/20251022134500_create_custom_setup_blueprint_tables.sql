-- Custom setup blueprint schema to support configurable CCTV / IT bundles
-- Allows admins to model templates, systems (e.g. DVR vs NVR), components,
-- selectable options, and capture bespoke configurations per customer request.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Top-level template definitions (e.g. "CCTV Camera Full Setup")
CREATE TABLE IF NOT EXISTS public.custom_setup_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  hero_copy text,
  base_price numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'INR',
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (slug)
);

COMMENT ON TABLE public.custom_setup_templates IS 'Blueprints for configurable solution bundles such as CCTV or IT deployments.';

-- Variables surface knobs that influence pricing formulas (e.g. camera_count)
CREATE TABLE IF NOT EXISTS public.custom_setup_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_setup_templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  input_type text NOT NULL DEFAULT 'number',
  description text,
  min_value numeric,
  max_value numeric,
  step_value numeric,
  default_value jsonb,
  is_required boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (template_id, key)
);

COMMENT ON TABLE public.custom_setup_variables IS 'User-input variables that drive component quantities and pricing formulas.';

-- Systems represent high-level variants within a template (e.g. DVR vs NVR)
CREATE TABLE IF NOT EXISTS public.custom_setup_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_setup_templates(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 100,
  base_fee numeric(12,2) DEFAULT 0,
  pricing_formula text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (template_id, slug)
);

COMMENT ON TABLE public.custom_setup_systems IS 'Distinct build paths inside a template, such as DVR or NVR configurations.';

-- Components capture the building blocks required for a system
CREATE TABLE IF NOT EXISTS public.custom_setup_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.custom_setup_systems(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  is_required boolean DEFAULT true,
  min_quantity numeric(12,2) DEFAULT 0,
  max_quantity numeric(12,2),
  default_quantity numeric(12,2) DEFAULT 0,
  quantity_variable text,
  pricing_mode text NOT NULL DEFAULT 'per_unit', -- per_unit | fixed | formula
  base_price numeric(12,2) DEFAULT 0,
  unit_price numeric(12,2) DEFAULT 0,
  price_formula text,
  product_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (system_id, slug),
  CHECK (max_quantity IS NULL OR min_quantity IS NULL OR min_quantity <= max_quantity)
);

COMMENT ON TABLE public.custom_setup_components IS 'Concrete hardware/service items (e.g. DVR, camera, cable) with quantity and pricing rules.';

-- Optional choices per component (e.g. 4ch DVR vs 8ch DVR)
CREATE TABLE IF NOT EXISTS public.custom_setup_component_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.custom_setup_components(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text,
  description text,
  product_id uuid,
  is_default boolean DEFAULT false,
  min_quantity numeric(12,2) DEFAULT 1,
  max_quantity numeric(12,2),
  unit_price numeric(12,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (max_quantity IS NULL OR min_quantity IS NULL OR min_quantity <= max_quantity)
);

COMMENT ON TABLE public.custom_setup_component_options IS 'Selectable variants for each component, optionally mapped to catalogue products.';

-- Saved bespoke builds for individual customers or projects
CREATE TABLE IF NOT EXISTS public.custom_setup_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.custom_setup_templates(id) ON DELETE CASCADE,
  system_id uuid REFERENCES public.custom_setup_systems(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  quantity_inputs jsonb DEFAULT '{}'::jsonb,
  pricing_breakdown jsonb DEFAULT '{}'::jsonb,
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  currency text DEFAULT 'INR',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (status IN ('draft','pending_review','finalised','cancelled'))
);

COMMENT ON TABLE public.custom_setup_configurations IS 'Individual customer configurations generated from a template, including computed pricing and selections.';

-- Line items for a saved configuration
CREATE TABLE IF NOT EXISTS public.custom_setup_configuration_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id uuid NOT NULL REFERENCES public.custom_setup_configurations(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.custom_setup_components(id) ON DELETE SET NULL,
  option_id uuid REFERENCES public.custom_setup_component_options(id) ON DELETE SET NULL,
  label text NOT NULL,
  quantity numeric(12,2) DEFAULT 0,
  unit_price numeric(12,2) DEFAULT 0,
  total_price numeric(12,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.custom_setup_configuration_items IS 'Expanded breakdown of each customised build, capturing component quantities and pricing used for quotations.';

-- Helpful indexes for querying templates, systems, and components quickly
CREATE INDEX IF NOT EXISTS idx_custom_setup_templates_active ON public.custom_setup_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_setup_systems_template ON public.custom_setup_systems(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_custom_setup_components_system ON public.custom_setup_components(system_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_custom_setup_component_options_component ON public.custom_setup_component_options(component_id);
CREATE INDEX IF NOT EXISTS idx_custom_setup_configurations_template ON public.custom_setup_configurations(template_id, status);
CREATE INDEX IF NOT EXISTS idx_custom_setup_configuration_items_config ON public.custom_setup_configuration_items(configuration_id);

-- Seed a CCTV bundle blueprint with DVR and NVR systems when absent
DO $$
DECLARE
  tmpl_id uuid;
  dvr_system_id uuid;
  nvr_system_id uuid;
  comp_dvr uuid;
  comp_analog_cam uuid;
  comp_smps uuid;
  comp_coax uuid;
  comp_dvr_hdd uuid;
  comp_dvr_install uuid;
  comp_nvr uuid;
  comp_ip_cam uuid;
  comp_poe uuid;
  comp_cat6 uuid;
  comp_nvr_hdd uuid;
  comp_nvr_install uuid;
BEGIN
  SELECT id INTO tmpl_id FROM public.custom_setup_templates WHERE slug = 'cctv-camera-full-setup';

  IF tmpl_id IS NOT NULL THEN
    RAISE NOTICE 'CCTV camera setup blueprint already seeded (id=%). Skipping seed.', tmpl_id;
    RETURN;
  END IF;

  INSERT INTO public.custom_setup_templates (slug, name, description, category, hero_copy, base_price, metadata)
  VALUES (
    'cctv-camera-full-setup',
    'CCTV Camera Full Setup',
    'Complete CCTV deployment bundle including recorder, cameras, cabling, storage, and installation.',
    'security',
    'Select between DVR (analog) or NVR (IP) builds and tailor the quantities and options per site.',
    0,
    jsonb_build_object('seed', '20251022', 'version', 1)
  )
  RETURNING id INTO tmpl_id;

  -- User adjustable variables driving pricing/quantities
  INSERT INTO public.custom_setup_variables (
    template_id, key, label, input_type, description,
    min_value, max_value, step_value, default_value, metadata
  ) VALUES (
    tmpl_id,
    'camera_count',
    'Number of Cameras',
    'number',
    'How many cameras are required at the site?',
    1,
    64,
    1,
    to_jsonb(4),
    jsonb_build_object('units', 'count', 'ui', 'slider')
  );

  INSERT INTO public.custom_setup_variables (
    template_id, key, label, input_type, description,
    min_value, max_value, step_value, default_value, metadata
  ) VALUES (
    tmpl_id,
    'total_cable_length_m',
    'Estimated Cable Length (meters)',
    'number',
    'Total RG59 / Cat6 cable length required across all runs.',
    50,
    2000,
    5,
    to_jsonb(120),
    jsonb_build_object('units', 'meter', 'default_formula', 'camera_count * 30')
  );

  -- Systems
  INSERT INTO public.custom_setup_systems (
    template_id, slug, name, description, sort_order, base_fee, metadata, is_default
  ) VALUES (
    tmpl_id,
    'dvr-system',
    'Analog DVR System',
    'Coaxial camera deployment leveraging a DVR recorder.',
    10,
    0,
    jsonb_build_object('recommended', 'Legacy analog infrastructure'),
    true
  ) RETURNING id INTO dvr_system_id;

  INSERT INTO public.custom_setup_systems (
    template_id, slug, name, description, sort_order, base_fee, metadata
  ) VALUES (
    tmpl_id,
    'nvr-system',
    'IP NVR System',
    'Cat6 based IP camera deployment using an NVR recorder and POE switching.',
    20,
    0,
    jsonb_build_object('recommended', 'Higher resolution / scalable deployments')
  ) RETURNING id INTO nvr_system_id;

  -- DVR components
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'dvr-recorder',
    'DVR (Recorder)',
    'Channel capacity should match or exceed planned camera count.',
    true,
    1,
    1,
    1,
    'per_unit',
    0,
    jsonb_build_object('notes', 'Includes remote viewing configuration'),
    10
  ) RETURNING id INTO comp_dvr;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    quantity_variable, pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'analog-camera',
    'Analog Cameras',
    'Quantity mirrors the selected camera count.',
    true,
    1,
    NULL,
    4,
    'camera_count',
    'per_unit',
    0,
    jsonb_build_object('quantity_source', 'camera_count', 'pricing', 'option_unit_price'),
    20
  ) RETURNING id INTO comp_analog_cam;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'smps-power',
    'SMPS (Power Supply)',
    'Power blocks sized to the number of cameras.',
    true,
    1,
    4,
    1,
    'per_unit',
    1200,
    jsonb_build_object('auto_quantity_formula', 'ceil(camera_count / 4.0)', 'notes', 'Assume one SMPS per 4 cameras'),
    30
  ) RETURNING id INTO comp_smps;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'coaxial-cable',
    'RG59 Coaxial Cable',
    'Provide sufficient cable rolls based on total runs.',
    true,
    1,
    1,
    'per_unit',
    2600,
    jsonb_build_object('quantity_mode', 'manual', 'guidance_variable', 'total_cable_length_m'),
    40
  ) RETURNING id INTO comp_coax;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'dvr-storage',
    'Surveillance HDD',
    'Set storage retention based on customer expectations.',
    true,
    1,
    1,
    1,
    'per_unit',
    0,
    jsonb_build_object('notes', 'Select surveillance rated drives'),
    50
  ) RETURNING id INTO comp_dvr_hdd;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, price_formula, metadata, sort_order
  ) VALUES (
    dvr_system_id,
    'installation-service',
    'Installation & Configuration',
    'Labour estimate driven by camera count.',
    true,
    1,
    1,
    1,
    'formula',
    '999 + (50 * camera_count)',
    jsonb_build_object('formula_notes', 'Base INR 999 plus INR 50 per camera'),
    60
  ) RETURNING id INTO comp_dvr_install;

  -- DVR component options
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_dvr, '4 channel DVR', 'dvr-4ch', 'Supports up to 4 analog cameras.', 4500, true, jsonb_build_object('channel_count', 4)),
    (comp_dvr, '8 channel DVR', 'dvr-8ch', 'Supports up to 8 analog cameras.', 6500, false, jsonb_build_object('channel_count', 8)),
    (comp_dvr, '16 channel DVR', 'dvr-16ch', 'Supports up to 16 analog cameras.', 11500, false, jsonb_build_object('channel_count', 16)),
    (comp_dvr, '32 channel DVR', 'dvr-32ch', 'Supports up to 32 analog cameras.', 19500, false, jsonb_build_object('channel_count', 32));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_analog_cam, '2.4 MP IR TurboHD Camera', 'analog-2_4mp', 'Weather resistant analog camera with IR LEDs.', 1650, true, jsonb_build_object('megapixels', '2.4', 'type', 'turbohd')),
    (comp_analog_cam, '5 MP Analog Dome Camera', 'analog-5mp', 'High definition analog dome camera.', 2200, false, jsonb_build_object('megapixels', '5'));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_smps, '12V 5A SMPS', 'smps-5a', 'Recommended for up to 4 cameras.', 950, true, jsonb_build_object('capacity_cameras', 4)),
    (comp_smps, '12V 10A SMPS', 'smps-10a', 'Supports dense camera clusters.', 1550, false, jsonb_build_object('capacity_cameras', 8));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_coax, 'RG59 Coaxial Cable - 100 m roll', 'coax-100m', 'Standard copper RG59 CCTV roll.', 2600, true, jsonb_build_object('coverage_m', 100)),
    (comp_coax, 'RG59 Coaxial Cable - 200 m roll', 'coax-200m', 'Extended length roll for larger sites.', 5100, false, jsonb_build_object('coverage_m', 200));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_dvr_hdd, 'Surveillance HDD 500 GB (Refurb)', 'hdd-500gb-refurb', 'Budget drive for short retention.', 2200, false, jsonb_build_object('capacity_tb', 0.5)),
    (comp_dvr_hdd, 'Surveillance HDD 1 TB', 'hdd-1tb', 'Entry retention option.', 3200, true, jsonb_build_object('capacity_tb', 1)),
    (comp_dvr_hdd, 'Surveillance HDD 2 TB', 'hdd-2tb', 'Extended retention option.', 5200, false, jsonb_build_object('capacity_tb', 2));

  -- NVR components
  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'nvr-recorder',
    'NVR (Recorder)',
    'IP camera compatible recorder with remote access.',
    true,
    1,
    1,
    1,
    'per_unit',
    0,
    jsonb_build_object('notes', 'Support for H.265+, remote viewing, and POE pass-through where available'),
    10
  ) RETURNING id INTO comp_nvr;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, default_quantity,
    quantity_variable, pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'ip-camera',
    'IP Cameras',
    'Qty equals selected camera count.',
    true,
    1,
    4,
    'camera_count',
    'per_unit',
    0,
    jsonb_build_object('quantity_source', 'camera_count', 'pricing', 'option_unit_price'),
    20
  ) RETURNING id INTO comp_ip_cam;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'poe-switch',
    'POE Switch',
    'Select POE switching to power and aggregate cameras.',
    true,
    1,
    4,
    1,
    'per_unit',
    3400,
    jsonb_build_object('auto_quantity_formula', 'ceil(camera_count / 8.0)', 'notes', 'Choose based on channel density'),
    30
  ) RETURNING id INTO comp_poe;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'cat6-cable',
    'Cat6 Network Cable',
    'Supply Cat6 boxes matching total run length.',
    true,
    1,
    1,
    'per_unit',
    3800,
    jsonb_build_object('quantity_mode', 'manual', 'guidance_variable', 'total_cable_length_m'),
    40
  ) RETURNING id INTO comp_cat6;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, unit_price, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'nvr-storage',
    'Surveillance HDD',
    'Storage tier matched to retention requirements.',
    true,
    1,
    1,
    1,
    'per_unit',
    0,
    jsonb_build_object('notes', 'Use surveillance rated HDDs / SSDs'),
    50
  ) RETURNING id INTO comp_nvr_hdd;

  INSERT INTO public.custom_setup_components (
    system_id, slug, name, description, is_required,
    min_quantity, max_quantity, default_quantity,
    pricing_mode, price_formula, metadata, sort_order
  ) VALUES (
    nvr_system_id,
    'installation-service',
    'Installation & Configuration',
    'Labour estimate driven by camera count.',
    true,
    1,
    1,
    1,
    'formula',
    '999 + (50 * camera_count)',
    jsonb_build_object('formula_notes', 'Base INR 999 plus INR 50 per camera'),
    60
  ) RETURNING id INTO comp_nvr_install;

  -- NVR options
  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr, '8 channel NVR', 'nvr-8ch', 'Supports up to 8 IP cameras.', 8200, true, jsonb_build_object('channel_count', 8)),
    (comp_nvr, '16 channel NVR', 'nvr-16ch', 'Supports up to 16 IP cameras.', 11800, false, jsonb_build_object('channel_count', 16)),
    (comp_nvr, '32 channel NVR', 'nvr-32ch', 'Supports up to 32 IP cameras.', 18900, false, jsonb_build_object('channel_count', 32));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
  (comp_ip_cam, '2 MP IP Dome Camera', 'ip-2mp', 'PoE dome camera with IR and analytics.', 2800, true, jsonb_build_object('megapixels', '2', 'form_factor', 'dome')),
  (comp_ip_cam, '4 MP IP Bullet Camera', 'ip-4mp', 'Outdoor bullet camera with smart IR.', 3600, false, jsonb_build_object('megapixels', '4', 'form_factor', 'bullet'));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_poe, '8+2 Port POE Switch', 'poe-8-2', '8 POE ports + 2 uplinks.', 3400, true, jsonb_build_object('poe_ports', 8)),
    (comp_poe, '16+2 Port POE Switch', 'poe-16-2', '16 POE ports + 2 uplinks.', 5600, false, jsonb_build_object('poe_ports', 16));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_cat6, 'LAN Cable - 100 m box', 'lan-100m', 'Solid copper LAN cable box (100 m).', 3800, true, jsonb_build_object('coverage_m', 100));

  INSERT INTO public.custom_setup_component_options (component_id, label, value, description, unit_price, is_default, metadata)
  VALUES
    (comp_nvr_hdd, 'Surveillance HDD 1 TB', 'nvr-hdd-1tb', 'Entry retention option.', 3200, false, jsonb_build_object('capacity_tb', 1)),
    (comp_nvr_hdd, 'Surveillance HDD 2 TB', 'nvr-hdd-2tb', 'Standard retention option.', 5200, true, jsonb_build_object('capacity_tb', 2)),
    (comp_nvr_hdd, 'Surveillance HDD 4 TB', 'nvr-hdd-4tb', 'Extended retention option.', 9200, false, jsonb_build_object('capacity_tb', 4));

  RAISE NOTICE 'Seeded CCTV camera setup blueprint (template id=%).', tmpl_id;
END $$;
