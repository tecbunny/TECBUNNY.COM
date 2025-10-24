-- Update existing IP camera option to reflect actual 4 MP specification
BEGIN;

UPDATE public.custom_setup_component_options
SET
  label = '4 MP IP Bullet Camera',
  value = 'ip-4mp',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('megapixels', 4, 'form_factor', 'bullet')
WHERE value = 'ip-5mp';

UPDATE public.custom_setup_component_options
SET
  label = 'LAN Cable - 100 m box',
  value = 'lan-100m'
WHERE value = 'cat6-100m';

DELETE FROM public.custom_setup_component_options
WHERE value IN ('cat6-305m', 'dvr-cable-200m');

COMMIT;
