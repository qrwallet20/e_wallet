import crypto from "crypto";
import { EMBEDLY_STAGING_KEY } from "../config/env.js";

export const verifySignature = (req, res, next) => {
  const signature = req.headers["x-embedly-signature"];
  const rawBody = req.rawBody;

  if (!signature || !rawBody) {
    return res.status(400).json({ error: "Missing signature or body" });
  }

  const hmac = crypto.createHmac("sha512", EMBEDLY_STAGING_KEY);
  hmac.update(rawBody, "utf8");
  const computedSignature = hmac.digest("hex");

  // (optional) timing-safe compare if you normalize to equal-length buffers
  // const sigBuf = Buffer.from(signature, "hex");
  // const compBuf = Buffer.from(computedSignature, "hex");
  // const ok = sigBuf.length === compBuf.length && crypto.timingSafeEqual(sigBuf, compBuf);
  // if (!ok) { return res.status(401).json({ status: "error", message: "Invalid signature" }); }

  if (computedSignature !== signature) {
    return res.status(401).json({ status: "error", message: "Invalid signature" });
  }

  return next();
};
