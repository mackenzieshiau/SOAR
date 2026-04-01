import { createGoogleSheetSyncResponse } from "../server/google-sheet-sync.js";

export default async function handler(req, res) {
  const result = await createGoogleSheetSyncResponse({
    method: req.method,
    body: req.body,
    env: process.env,
  });
  res.status(result.status).json(result.body);
}
