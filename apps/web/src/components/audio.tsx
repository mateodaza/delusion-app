import React, { useState, useEffect, useCallback, useRef } from 'react';

export const useDynamicMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerIdRef = useRef<number | null>(null);

  // const chordProgression = [
  //   { name: 'Am', frequencies: [220.0, 261.63, 329.63] }, // A, C, E
  //   { name: 'C', frequencies: [261.63, 329.63, 392.0] }, // C, E, G
  //   { name: 'G', frequencies: [196.0, 246.94, 392.0] }, // G, B, G
  //   { name: 'F', frequencies: [174.61, 220.0, 349.23] }, // F, A, F
  // ];
  const chordProgression = [
    { name: 'Am', frequencies: [220.0, 261.63, 329.63] }, // A, C, E
    { name: 'C', frequencies: [261.63, 329.63, 392.0] }, // C, E, G
    { name: 'F', frequencies: [174.61, 220.0, 349.23] }, // F, A, C
    { name: 'G', frequencies: [196.0, 246.94, 392.0] }, // G, B, D
    { name: 'Am', frequencies: [220.0, 261.63, 329.63] }, // A, C, E
  ];

  // Additional passing tones or bass notes to consider
  const bassMelody = [220.0, 261.63, 174.61, 196.0, 220.0]; // A, C, F, G, A

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
    (
      chord: { frequencies: number[] },
      bassNote: number,
      time: number,
      duration: number
    ) => {
      if (!audioContextRef.current) return;

      // Play bass note
      const bassOsc = audioContextRef.current.createOscillator();
      bassOsc.frequency.setValueAtTime(bassNote, time);
      const bassGain = audioContextRef.current.createGain();
      bassGain.gain.setValueAtTime(0.2, time);
      bassGain.gain.linearRampToValueAtTime(0, time + duration - 0.1);
      bassOsc.connect(bassGain).connect(audioContextRef.current.destination);
      bassOsc.start(time);
      bassOsc.stop(time + duration);

      // Arpeggiate chord
      chord.frequencies.forEach((freq, index) => {
        const osc = audioContextRef.current!.createOscillator();
        osc.frequency.setValueAtTime(freq, time + (index * duration) / 4);
        const gain = audioContextRef.current!.createGain();
        gain.gain.setValueAtTime(0.1, time + (index * duration) / 4);
        gain.gain.linearRampToValueAtTime(
          0,
          time + ((index + 1) * duration) / 4
        );
        osc.connect(gain).connect(audioContextRef.current!.destination);
        osc.start(time + (index * duration) / 4);
        osc.stop(time + ((index + 1) * duration) / 4);
      });
    },
    []
  );

  const playProgression = useCallback(() => {
    if (!audioContextRef.current) return;

    const now = audioContextRef.current.currentTime;
    chordProgression.forEach((chord, index) => {
      playChord(
        chord,
        bassMelody[index],
        now + index * measureDuration,
        measureDuration
      );
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
