// api/files.ts
// Vercel Serverless Function for secure file operations
// Handles issuance of short-lived Zoho WorkDrive upload and download URLs.

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getZohoAccessToken(): Promise<string | null> {
  const dc = process.env.ZOHO_DC || 'in';
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || `https://accounts.zoho.${dc}`;
  const clientId = process.env.ZOHO_CLIENT_ID || process.env.VITE_ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const tokenUrl = `${accountsUrl}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;
    const resp = await fetch(tokenUrl, { method: 'POST' });
    if (!resp.ok) {
      console.error('Failed to refresh Zoho token:', resp.statusText);
      return null;
    }
    const data = (await resp.json()) as ZohoTokenResponse;
    return data.access_token;
  } catch (err) {
    console.error('Zoho OAuth exception:', err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lextria-app');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, resourceId } = req.query;

  // 1. Issue WorkDrive Upload URL
  if (req.method === 'POST' && action === 'upload_url') {
    const { folderPath, fileName } = req.body || {};
    const rootFolderId = process.env.VITE_WORKDRIVE_ROOT_FOLDER_ID;

    if (!rootFolderId) {
      return res.status(503).json({
        error: 'WorkDrive is unconfigured. Set VITE_WORKDRIVE_ROOT_FOLDER_ID.',
      });
    }

    const token = await getZohoAccessToken();
    if (!token) {
      return res.status(502).json({
        error: 'Could not obtain Zoho access token. Check OAuth credentials.',
      });
    }

    const dc = process.env.ZOHO_DC || 'in';
    const apiBaseUrl = process.env.ZOHO_API_BASE_URL || `https://www.zohoapis.${dc}`;
    const workdriveBaseUrl = process.env.ZOHO_WORKDRIVE_BASE_URL || `https://workdrive.zoho.${dc}`;

    try {
      // In production WorkDrive API: POST /api/v1/workdrive/upload?parent_id={folderId}&filename={fileName}
      const uploadUrl = `${apiBaseUrl}/workdrive/api/v1/upload?parent_id=${encodeURIComponent(
        rootFolderId
      )}&filename=${encodeURIComponent(fileName || 'file.pdf')}`;

      const dummyResourceId = `res-${Date.now()}`;
      const dummyPermalink = `${workdriveBaseUrl}/file/${dummyResourceId}`;

      return res.status(200).json({
        uploadUrl,
        resourceId: dummyResourceId,
        permalink: dummyPermalink,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Issue WorkDrive Download URL
  if (req.method === 'GET' && action === 'download_url') {
    if (!resourceId) {
      return res.status(400).json({ error: 'Missing resourceId parameter' });
    }

    const token = await getZohoAccessToken();
    if (!token) {
      return res.status(503).json({
        error: 'WorkDrive not configured. Use SUPABASE_TEST or MOCK.',
      });
    }

    const dc = process.env.ZOHO_DC || 'in';
    const workdriveBaseUrl = process.env.ZOHO_WORKDRIVE_BASE_URL || `https://workdrive.zoho.${dc}`;

    try {
      // WorkDrive download URL issuance
      const downloadUrl = `${workdriveBaseUrl}/api/v1/download/${resourceId}`;
      return res.redirect(302, downloadUrl);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Unknown action or method' });
}
