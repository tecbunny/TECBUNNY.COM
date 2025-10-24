-- Seed landing content for the Customised Setups page.
-- The script adapts to older schemas that may not include SEO columns.

DO $$
DECLARE
  payload jsonb := jsonb_build_object(
    'hero', jsonb_build_object(
      'eyebrow', 'Tailored technology deployments',
      'headline', 'Customised CCTV & Computer Setups',
      'body', 'TecBunny architects design surveillance and computing environments that align with your operational, compliance, and budget goals. Pricing is finalised after a collaborative discovery session.'
    ),
    'setups', jsonb_build_array(
      jsonb_build_object(
        'key', 'cctv',
        'title', 'CCTV Surveillance Solutions',
        'subtitle', 'Smart protection engineered for your premises',
        'price_note', 'Pricing based on custom site assessment',
        'highlights', jsonb_build_array(
          'Hybrid wired and wireless layouts with remote monitoring',
          'Storage retention planning plus NDAA-compliant hardware options',
          'Integrations with access control, alarms, and legacy security layers'
        )
      ),
      jsonb_build_object(
        'key', 'computers',
        'title', 'Computer & IT Infrastructure',
        'subtitle', 'Performance-tuned systems for work, play, or enterprise',
        'price_note', 'Pricing finalised after configuration workshop',
        'highlights', jsonb_build_array(
          'Desktop, workstation, and server builds matched to workload profiles',
          'Lifecycle services covering imaging, deployment, and asset tracking',
          'Managed support bundles with SLA-driven response and remote helpdesk'
        )
      )
    ),
    'engagement', jsonb_build_object(
      'steps', jsonb_build_array(
        'Share requirements, floor plans, or workload expectations',
        'Consult with TecBunny solution architects for optimisation paths',
        'Review a detailed proposal with bill of materials and timelines',
        'Approve, schedule, and receive certified installation and handover'
      )
    ),
    'cta', jsonb_build_object(
      'primary_label', 'Book a discovery call',
      'primary_href', '/contact',
      'secondary_label', 'Email the solution desk',
      'secondary_href', 'mailto:solutions@tecbunny.com'
    )
  );
  column_list text[] := ARRAY[]::text[];
  value_list text[] := ARRAY[]::text[];
  update_clauses text[] := ARRAY[]::text[];
  conflict_column text;
  has_page_key boolean;
  has_key boolean;
  has_meta_description boolean;
  has_meta_keywords boolean;
  has_status boolean;
  content_data_type text;
  insert_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'page_content' AND column_name = 'page_key'
  ) INTO has_page_key;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'page_content' AND column_name = 'key'
  ) INTO has_key;

  IF NOT has_page_key AND NOT has_key THEN
    RAISE EXCEPTION 'page_content table must contain either page_key or key column';
  END IF;

  conflict_column := CASE WHEN has_page_key THEN 'page_key' ELSE 'key' END;

  column_list := array_append(column_list, conflict_column);
  value_list := array_append(value_list, quote_literal('customised-setups'));

  column_list := array_append(column_list, 'title');
  value_list := array_append(value_list, quote_literal('Customised Setups'));
  update_clauses := array_append(update_clauses, 'title = EXCLUDED.title');

  column_list := array_append(column_list, 'content');
  SELECT data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'page_content' AND column_name = 'content'
  INTO content_data_type;

  IF content_data_type IN ('jsonb', 'json') THEN
    value_list := array_append(value_list, format('%L::%s', payload::text, content_data_type));
  ELSE
    value_list := array_append(value_list, quote_literal(payload::text));
  END IF;
  update_clauses := array_append(update_clauses, 'content = EXCLUDED.content');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'page_content' AND column_name = 'meta_description'
  ) INTO has_meta_description;

  IF has_meta_description THEN
    column_list := array_append(column_list, 'meta_description');
    value_list := array_append(value_list, quote_literal('Tailored CCTV and computer infrastructure engagements with TecBunny experts.'));
    update_clauses := array_append(update_clauses, 'meta_description = EXCLUDED.meta_description');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'page_content' AND column_name = 'meta_keywords'
  ) INTO has_meta_keywords;

  IF has_meta_keywords THEN
    column_list := array_append(column_list, 'meta_keywords');
    value_list := array_append(value_list, quote_literal('customised setups, cctv, computer infrastructure, tecbunny solutions'));
    update_clauses := array_append(update_clauses, 'meta_keywords = EXCLUDED.meta_keywords');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'page_content' AND column_name = 'status'
  ) INTO has_status;

  IF has_status THEN
    column_list := array_append(column_list, 'status');
    value_list := array_append(value_list, quote_literal('published'));
    update_clauses := array_append(update_clauses, 'status = EXCLUDED.status');
  END IF;

  insert_sql := format(
    'INSERT INTO public.page_content (%s) VALUES (%s)',
    array_to_string(ARRAY(SELECT format('%I', col) FROM unnest(column_list) AS col), ', '),
    array_to_string(value_list, ', ')
  );

  IF array_length(update_clauses, 1) IS NOT NULL THEN
    insert_sql := insert_sql || format(' ON CONFLICT (%I) DO UPDATE SET %s', conflict_column, array_to_string(update_clauses, ', '));
  ELSE
    insert_sql := insert_sql || format(' ON CONFLICT (%I) DO NOTHING', conflict_column);
  END IF;

  EXECUTE insert_sql;
END $$;
