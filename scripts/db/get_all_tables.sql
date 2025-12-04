-- =============================================
-- Get All Table Names Script
-- Lists all tables in the current database
-- =============================================

-- Method 1: Get all tables in public schema
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Method 2: Get tables with additional details
SELECT 
    schemaname as schema,
    tablename as table_name,
    tableowner as owner,
    hasindexes as has_indexes,
    hasrules as has_rules,
    hastriggers as has_triggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Method 3: Get table names only (simple list)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Method 4: Get tables with row counts (may be slow for large databases)
SELECT 
    schemaname,
    relname as table_name,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY relname;

-- Method 5: Count total tables
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';