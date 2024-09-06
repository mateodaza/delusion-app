import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { messageId, imageUrl } = req.body;

    if (
      !messageId ||
      !imageUrl ||
      typeof messageId !== 'string' ||
      typeof imageUrl !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid messageId or imageUrl' });
    }

    try {
      await kv.set(`image:${messageId}`, imageUrl);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving image:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
