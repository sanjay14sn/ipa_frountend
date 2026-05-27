const isDev = process.env.NODE_ENV !== "production";

/**
 * Reads an env var. In production, throws if missing or empty.
 * In development, warns and returns devFallback.
 * Note: NEXT_PUBLIC_* vars are inlined at build time — ensure they
 * are set in the build environment or in .env.local.
 */
 function requireEnv(name: string, value: string | undefined, devFallback?: string): string {
   if (value && value.trim()) return value.trim();
 
   if (isDev && devFallback !== undefined) {
     console.warn(`[config] ${name} not set - using dev fallback: ${devFallback}`);
     return devFallback;
   }
 
   throw new Error(
     `[config] Required environment variable "${name}" is missing or empty. ` +
       `Set it before starting the server.`
   );
 }
 
 export const API_BASE_URL = requireEnv(
   "NEXT_PUBLIC_API_URL",
   process.env.NEXT_PUBLIC_API_URL,
   "http://localhost:5500"
 );
 
 export const RAZORPAY_KEY_ID = requireEnv(
   "NEXT_PUBLIC_RAZORPAY_KEY_ID",
   process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
   ""
 );

export const CLIENT_TELEMETRY_ENABLED =
  process.env.NEXT_PUBLIC_CLIENT_TELEMETRY_ENABLED === "true";
