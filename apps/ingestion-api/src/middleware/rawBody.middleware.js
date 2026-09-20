import express from 'express';

// Parses JSON while stashing the unmutated Buffer on req.rawBody
export const rawBodyParser = express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});