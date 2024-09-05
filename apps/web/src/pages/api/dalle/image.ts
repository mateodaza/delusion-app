import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { prompt } = req.query;

  if (!prompt || typeof prompt !== 'string') {
    return res
      .status(400)
      .json({ error: 'Prompt is required and must be a string' });
  }

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      quality: 'standard',
      size: '1024x1024',
    });

    const image_url = response.data[0].url;

    return res.status(200).json({ image_url });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res
      .status(500)
      .json({ message: error.message, type: 'Internal server error' });
  }
}
