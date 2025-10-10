import express from "express";

// Captures raw body bytes for HMAC verification
export const jsonWithRaw = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString("utf8");
  }
});
