import { useState, useCallback } from 'react';

export function useImageGenerator() {
  const [images, setImages] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = useCallback(
    async (stepIndex: number, prompt: string) => {
      setIsGenerating(true);

      try {
        const response = await fetch(
          `/api/dalle/image?prompt=${encodeURIComponent(prompt)}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to generate image');
        }

        const data = await response.json();
        setImages((prevImages) => ({
          ...prevImages,
          [stepIndex]: data.image_url,
        }));
        return data.image_url;
      } catch (error) {
        console.error('Error generating image:', error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    images,
    isGenerating,
    generateImage,
  };
}
