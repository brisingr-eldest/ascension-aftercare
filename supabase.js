import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://gdmhsmtbfziexehvltmj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_t44PHJn3csRC7hdn6-ERUg_T_P_5gbl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);