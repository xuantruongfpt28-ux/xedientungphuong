import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qizumogeilrainjbstcq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__ukhoS90rN40bd7IwbY4LA_2Q6oD5Zy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);