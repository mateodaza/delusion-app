import React, { useState, useEffect, useCallback, useRef } from 'react';

export const useDynamicMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerIdRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);

  const chordProgression = [
    { name: 'Fm', frequencies: [174.61, 220.0, 261.63] }, // F, A♭, C
    { name: 'B♭', frequencies: [233.08, 293.66, 349.23] }, // B♭, D, F
    { name: 'E♭', frequencies: [311.13, 392.0, 466.16] }, // E♭, G, B♭
    { name: 'Cm', frequencies: [261.63, 311.13, 392.0] }, // C, E♭, G
  ];

  const bpm = 66;
  const beatDuration = 60 / bpm;
  const measureDuration = beatDuration * 4;

  const createReverb = useCallback(
    (audioContext: AudioContext, duration = 2) => {
      const convolver = audioContext.createConvolver();
      const rate = audioContext.sampleRate;
      const length = rate * duration;
      const impulse = audioContext.createBuffer(2, length, rate);
      const impulseL = impulse.getChannelData(0);
      const impulseR = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const n = i / length;
        impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, 2);
        impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, 2);
      }

      convolver.buffer = impulse;
      return convolver;
    },
    []
  );

  const playChord = useCallback(
    (chord: { frequencies: number[] }, time: number, duration: number) => {
      if (!audioContextRef.current) return;

      const reverb = createReverb(audioContextRef.current);
      const masterGain = audioContextRef.current.createGain();
      masterGain.gain.setValueAtTime(0.3, time);
      masterGain.connect(reverb);
      reverb.connect(audioContextRef.current.destination);

      chord.frequencies.forEach((frequency, index) => {
        const oscillator = audioContextRef.current!.createOscillator();
        oscillator.type = 'sine'; // Sine waves for a softer sound
        oscillator.frequency.setValueAtTime(frequency, time);

        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.1, time + 0.1); // Soft attack
        gainNode.gain.linearRampToValueAtTime(0.05, time + duration - 0.5); // Subtle fade
        gainNode.gain.linearRampToValueAtTime(0, time + duration); // Soft release

        // Subtle pulse effect
        const lfo = audioContextRef.current!.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.5, time); // 0.5 Hz pulse
        const lfoGain = audioContextRef.current!.createGain();
        lfoGain.gain.setValueAtTime(0.02, time); // Subtle amount of pulse
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        lfo.start(time);
        lfo.stop(time + duration);

        oscillator.connect(gainNode);
        gainNode.connect(masterGain);

        oscillator.start(time);
        oscillator.stop(time + duration);

        activeOscillatorsRef.current.push(oscillator);
      });
    },
    [createReverb]
  );

  const playProgression = useCallback(() => {
    if (!audioContextRef.current) return;

    const now = audioContextRef.current.currentTime;
    chordProgression.forEach((chord, index) => {
      playChord(chord, now + index * measureDuration, measureDuration * 1.5); // Overlap chords slightly
    });

    schedulerIdRef.current = window.setTimeout(
      playProgression,
      chordProgression.length * measureDuration * 1000
    );
  }, [playChord, measureDuration]);

  const startMusic = useCallback(() => {
    if (!isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      playProgression();
      setIsPlaying(true);
      console.log('Ambient music started');
    }
  }, [isPlaying, playProgression]);

  const stopMusic = useCallback(() => {
    if (schedulerIdRef.current) {
      clearTimeout(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }

    // Immediately stop and disconnect all active oscillators
    if (audioContextRef.current) {
      activeOscillatorsRef.current.forEach((osc) => {
        osc.stop(audioContextRef.current!.currentTime);
        osc.disconnect();
      });
      activeOscillatorsRef.current = [];

      // Create a new AudioContext to ensure all audio processing is stopped
      audioContextRef.current.close().then(() => {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      });
    }

    setIsPlaying(false);
    console.log('Music stopped abruptly');
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

export const AmbientMusicPlayer: React.FC = () => {
  const { isPlaying, startMusic, stopMusic } = useDynamicMusic();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!!stopMusic) return;
      startMusic();
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [startMusic]);

  return (
    <div>
      <h2>Ambient Human Sadness Outro</h2>
      <button onClick={isPlaying ? stopMusic : startMusic}>
        {isPlaying ? 'Fade Out Music' : 'Start Ambient Music'}
      </button>
    </div>
  );
};
