import { betterAuth } from "better-auth";
import pg from "pg";

const { Pool } = pg;
const isProduction = process.env.NODE_ENV === "production";
const backendUrl =
  process.env.BACKEND_URL ||
  (isProduction ? undefined : `http://localhost:${process.env.PORT || 3000}`);
const frontendOrigins = (
  process.env.FRONTEND_URL || (isProduction ? "" : "http://localhost:5173")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (isProduction && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in production.");
}

if (isProduction && !backendUrl) {
  throw new Error("BACKEND_URL must be set in production.");
}

if (isProduction && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in production.");
}

if (isProduction && frontendOrigins.length === 0) {
  throw new Error("FRONTEND_URL must be set in production.");
}

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
  }),
  baseURL: backendUrl,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
        input: true,
      },
      userType: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: true,
      },
      isOnline: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      latitude: {
        type: "number",
        required: false,
      },
      longitude: {
        type: "number",
        required: false,
      },
      rating: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      totalRatings: {
        type: "number",
        required: false,
        defaultValue: 0,
      },
      schedule: {
        type: "string",
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins: frontendOrigins,
});
