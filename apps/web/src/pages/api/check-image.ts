import type { NextApiRequest, NextApiResponse } from 'next';
import { kv } from '@vercel/kv';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { messageId } = req.query;

    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Invalid messageId' });
    }

    try {
      const existingImage = await kv.get<string>(`image:${messageId}`);
      if (existingImage) {
        return res.status(200).json({ imageUrl: existingImage });
      } else {
        return res.status(404).json({ error: 'Image not found' });
      }
    } catch (error) {
      console.error('Error checking existing image:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
