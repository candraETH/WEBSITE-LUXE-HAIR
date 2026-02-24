import "server-only"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL ?? "https://placeholder.supabase.co"
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-role-key"

export const hasSupabaseEnv = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
)
