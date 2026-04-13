// Browser client — safe to import in Client Components
export { createClient } from "./supabase-client";

// Server-only — only import in Server Components, Route Handlers, Server Actions
export { createServerSupabaseClient, createAdminClient } from "./supabase-server";
