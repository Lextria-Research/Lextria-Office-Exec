// api/upload.ts
// Ported from docs/reference/upload.js (Task Manager production WorkDrive upload)
// Handles token acquisition with caching and direct multipart file stream to Zoho WorkDrive.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import FormDataNode from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

let cachedToken: string | null = null;
let tokenExpiry = 0;

export function _resetTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lextria-app');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const form = new IncomingForm();
    form.parse(req, async (err: any, fields: any, files: any) => {
      if (err) {
        return res.status(500).json({ error: 'File parse error', details: err.message });
      }

      const fileList = files.file || files.files;
      const file = Array.isArray(fileList) ? fileList[0] : fileList;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const filePath = file.filepath || file.path;
      if (!filePath) {
        return res.status(400).json({ error: 'Uploaded file has no temporary path' });
      }
      const originalFilename = file.originalFilename || file.name || 'upload.ext';
      const fileMimeType = file.mimetype || file.type || 'application/octet-stream';

      const dc = process.env.ZOHO_DC || 'in';
      const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || `https://accounts.zoho.${dc}`;
      const apiBaseUrl = process.env.ZOHO_API_BASE_URL || `https://www.zohoapis.${dc}`;
      const workdriveBaseUrl = process.env.ZOHO_WORKDRIVE_BASE_URL || `https://workdrive.zoho.${dc}`;
      const clientId = process.env.ZOHO_CLIENT_ID || process.env.VITE_ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET;
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
      const folderId = process.env.ZOHO_FOLDER_ID || process.env.VITE_WORKDRIVE_ROOT_FOLDER_ID;

      // 1. Check Env Vars
      if (!clientId || !clientSecret || !refreshToken || !folderId) {
        return res.status(500).json({
          error:
            'Missing Environment Variables for Zoho WorkDrive. Please verify ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, and ZOHO_FOLDER_ID.',
        });
      }

      // 2. Token Fetch with Caching
      let tokenText = '';
      let accessToken = cachedToken;
      const now = Date.now();

      if (!accessToken || now > tokenExpiry) {
        try {
          const tokenUrl = `${accountsUrl}/oauth/v2/token?grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`;
          const tokenRes = await fetch(tokenUrl, { method: 'POST' });
          tokenText = await tokenRes.text();
          const tokenData = JSON.parse(tokenText);
          accessToken = tokenData.access_token;
          if (!accessToken) throw new Error('No access token in response: ' + tokenText);

          // Cache the token for 55 minutes (it lasts 60 mins)
          cachedToken = accessToken;
          tokenExpiry = now + 55 * 60 * 1000;
        } catch (e: any) {
          return res.status(500).json({
            error: 'Failed at Token Fetch',
            message: e.message,
            response: tokenText,
          });
        }
      }

      // 3. Upload Fetch
      let uploadText = '';
      try {
        const fileData = fs.readFileSync(filePath);
        const formPayload = new FormDataNode();
        formPayload.append('content', fileData, {
          filename: originalFilename,
          contentType: fileMimeType,
        });
        formPayload.append('parent_id', folderId);
        formPayload.append('override-name-exist', 'true');

        const uploadUrl = `${apiBaseUrl}/workdrive/api/v1/upload`;

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            ...formPayload.getHeaders(),
          },
          body: formPayload.getBuffer(),
        });

        uploadText = await uploadRes.text();

        if (!uploadRes.ok) {
          if (uploadRes.status === 401) {
            cachedToken = null;
            tokenExpiry = 0;
          }
          return res.status(uploadRes.status).json({
            error: 'Zoho HTTP Error',
            status: uploadRes.status,
            response: uploadText,
            debugUrl: uploadUrl,
            debugDC: dc,
            debugFolder: folderId,
          });
        }

        let uploadData: any;
        try {
          uploadData = JSON.parse(uploadText);
        } catch (e) {
          return res.status(500).json({ error: 'Zoho returned invalid JSON', response: uploadText });
        }

        if (uploadData.data && uploadData.data.length > 0) {
          const item = uploadData.data[0];
          const attrs = item.attributes || {};
          const permalink =
            attrs.Permalink ||
            attrs.permalink ||
            attrs.permalink_url ||
            attrs.download_url ||
            attrs.web_url ||
            attrs.url ||
            (attrs.resource_id ? `${workdriveBaseUrl}/file/${attrs.resource_id}` : null);
          const resourceId = attrs.resource_id || item.id || `res_${Date.now()}`;
          return res.status(200).json({
            url: permalink || '',
            resourceId,
            name: originalFilename,
          });
        } else {
          return res
            .status(500)
            .json({ error: 'Zoho upload failed to return data', details: uploadData });
        }
      } catch (e: any) {
        return res.status(500).json({
          error: 'Failed at Upload Fetch',
          message: e.message,
          response: uploadText,
        });
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Outer Exception', message: error.message });
  }
}
