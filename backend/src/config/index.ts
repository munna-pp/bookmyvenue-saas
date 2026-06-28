import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from backend .env or parent environment
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // Secret placeholders for later phase
  JWT_SECRET: z.string().default('dev-jwt-secret-key-should-be-long-and-secure'),
  JWT_REFRESH_SECRET: z.string().default('dev-jwt-refresh-secret-key-should-be-long-and-secure'),
  // Razorpay Test Mode keys
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder_key_id'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_placeholder_key_secret'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_test_placeholder_webhook_secret'),
  // SMTP Configuration
  SMTP_HOST: z.string().default('smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"BookMyVenue" <noreply@bookmyvenue.com>'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
