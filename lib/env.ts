const SUPABASE_REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variabel environment ${name} belum diatur.`);
  }

  return value;
}

export function isSupabaseConfigured(): boolean {
  return SUPABASE_REQUIRED_ENV.every((envName) => Boolean(process.env[envName]));
}

export function getMissingSupabaseEnv(): string[] {
  return SUPABASE_REQUIRED_ENV.filter((envName) => !process.env[envName]);
}

