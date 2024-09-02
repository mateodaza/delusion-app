import React, { useState, useEffect, useCallback, useRef } from 'react';

export const useDynamicMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerIdRef = useRef<number | null>(null);

  const chordProgression = [
    { name: 'Am', frequencies: [220.0, 261.63, 329.63] }, // A, C, E
    { name: 'C', frequencies: [261.63, 329.63, 392.0] }, // C, E, G
    { name: 'G', frequencies: [196.0, 246.94, 392.0] }, // G, B, G
    { name: 'F', frequencies: [174.61, 220.0, 349.23] }, // F, A, F
  ];

  const bpm = 80;
  const beatDuration = 60 / bpm;
  const measureDuration = beatDuration * 4; // 4 beats per measure

  const initAudio = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
  }, []);

  const playChord = useCallback(
    (chord: { frequencies: number[] }, time: number, duration: number) => {
      if (!audioContextRef.current) return;

      chord.frequencies.forEach((frequency) => {
        const oscillator = audioContextRef.current!.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, time);

        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.setValueAtTime(0.1, time); // Set initial volume
        gainNode.gain.linearRampToValueAtTime(0, time + duration - 0.1); // Fade out

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);

        oscillator.start(time);
        oscillator.stop(time + duration);
      });
    },
    []
  );

  const playProgression = useCallback(() => {
    if (!audioContextRef.current) return;

    const now = audioContextRef.current.currentTime;
    chordProgression.forEach((chord, index) => {
      playChord(chord, now + index * measureDuration, measureDuration);
    });

    // Schedule the next loop
    schedulerIdRef.current = window.setTimeout(
      playProgression,
      chordProgression.length * measureDuration * 1000
    );
  }, [playChord, measureDuration]);

  const startMusic = useCallback(() => {
    if (!isPlaying) {
      initAudio();
      playProgression();
      setIsPlaying(true);
      console.log('Music started');
    }
  }, [isPlaying, initAudio, playProgression]);

  const stopMusic = useCallback(() => {
    if (schedulerIdRef.current) {
      clearTimeout(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    setIsPlaying(false);
    console.log('Music stopped');
  }, []);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopMusic]);

  return { isPlaying, startMusic, stopMusic };
};

export const DynamicMusicPlayer: React.FC = () => {
  const { isPlaying, startMusic, stopMusic } = useDynamicMusic();

  return (
    <div>
      <h2>Dynamic Music Player</h2>
      <button onClick={isPlaying ? stopMusic : startMusic}>
        {isPlaying ? 'Stop Music' : 'Start Music'}
      </button>
    </div>
  );
};
