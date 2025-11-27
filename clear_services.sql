-- =============================================
-- Clear All Services Script
-- Removes all services from the services table
-- WARNING: This will delete ALL service data!
-- =============================================

BEGIN;

-- Clear service-related data in dependent tables first
DELETE FROM public.service_requests WHERE service_id IN (SELECT id FROM public.services);
DELETE FROM public.service_tickets WHERE service_id IN (SELECT id FROM public.services);

-- Now delete all services
DELETE FROM public.services;

-- Reset the sequence if it exists (handle different possible sequence names)
DO $$
BEGIN
    -- Try common sequence naming patterns for services
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'services_id_seq') THEN
        PERFORM setval('services_id_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'services_seq') THEN
        PERFORM setval('services_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%services%id%seq') THEN
        PERFORM setval(sequencename, 1, false) 
        FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%services%id%seq'
        LIMIT 1;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Services sequence reset skipped: %', SQLERRM;
END $$;

COMMIT;

-- Display success message
SELECT 'All services cleared successfully!' as message;
SELECT COUNT(*) as remaining_services FROM public.services;