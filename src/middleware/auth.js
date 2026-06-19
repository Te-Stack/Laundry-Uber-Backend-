import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";

/**
 * Middleware that validates the session via Better Auth.
 * Attaches session.user to req.user and session to req.session.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Please authenticate." });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Please authenticate." });
  }
};

/**
 * Middleware factory that checks if the authenticated user has a specific userType.
 * Must be used after requireAuth.
 */
export const checkUserType = (userType) => {
  return (req, res, next) => {
    if (req.user.userType !== userType) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};