import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasPlaceholderEnv =
  supabaseUrl?.includes("your-project-ref") ||
  supabaseAnonKey?.includes("your-anon-key");

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !hasPlaceholderEnv
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type JobRecord = {
  id: number;
  user_id?: string | null;
  title: string;
  company: string;
  salary: string;
  location: string;
  tags: string[] | null;
  view_count?: number | null;
  job_requirement?: string | null;
  language_requirement?: string | null;
  contact_info?: string | null;
  description: string | null;
  created_at: string;
};
