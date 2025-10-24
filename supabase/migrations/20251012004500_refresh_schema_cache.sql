-- Ensure Supabase PostgREST schema cache picks up newly added columns
NOTIFY pgrst, 'reload schema';
