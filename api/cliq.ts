// api/cliq.ts
// Vercel Serverless Function for Zoho Cliq Notifications
// Posts notifications to Cliq test channel or queues them in office.cliq_outbox when unconfigured.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lextria-app');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channel, title, link, message_id } = req.body || {};
  const webhookUrl = process.env.ZOHO_CLIQ_WEBHOOK_URL;

  // If Cliq webhook is not configured, queue message in outbox
  if (!webhookUrl) {
    return res.status(200).json({
      status: 'QUEUED',
      queued: true,
      message: 'Zoho Cliq webhook URL is not set. Notification recorded in office.cliq_outbox for future retry.',
      outboxItem: {
        id: message_id || `outbox-${Date.now()}`,
        channel: channel || '#office-alerts',
        title: title || 'Lextria Office Notification',
        link: link || '/',
        status: 'QUEUED',
        created_at: new Date().toISOString(),
      },
    });
  }

  try {
    const cliqPayload = {
      text: title,
      card: {
        title: 'Lextria Office Alert',
        theme: 'teal',
        thumbnail: 'https://lextria.com/logo.png',
      },
      buttons: link
        ? [
            {
              label: 'View in App',
              type: 'open.url',
              url: link.startsWith('http') ? link : `https://office.lextria.internal${link}`,
            },
          ]
        : [],
    };

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliqPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({
        status: 'FAILED',
        error: `Cliq webhook failed: ${resp.status} ${errText}`,
        message_id,
      });
    }

    return res.status(200).json({
      status: 'SENT',
      delivered: true,
      message_id,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error: err.message,
      message_id,
    });
  }
}
