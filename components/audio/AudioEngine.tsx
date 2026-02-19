import React, { useEffect, useRef } from 'react';
import { ScanResult } from '../../types';

interface AudioEngineProps {
    scanResult: ScanResult | null;
    isScanning: boolean;
}

const AudioEngine: React.FC<AudioEngineProps> = ({ scanResult, isScanning }) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const adsrRef = useRef<{ osc: OscillatorNode, gain: GainNode }[]>([]);
    const isMuted = useRef(false);

    useEffect(() => {
        // Init Audio Context on first interaction/mount (or rely on existing context)
        const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
        audioCtxRef.current = new AudioContext();

        return () => {
            audioCtxRef.current?.close();
        };
    }, []);

    useEffect(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        if (isScanning) {
            // Start ambient drone
            if (ctx.state === 'suspended') ctx.resume();

            // Create a low drone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(55, ctx.currentTime); // A1

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            adsrRef.current.push({ osc, gain });

            return () => {
                // Fade out
                gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
                setTimeout(() => osc.stop(), 1000);
            };
        }
    }, [isScanning]);

    useEffect(() => {
        const ctx = audioCtxRef.current;
        if (!ctx || !scanResult) return;

        // Modulate sound based on data
        // More wasted space = deeper, grittier sound
        const wastedGB = scanResult.wastedSpace / (1024 * 1024 * 1024);
        const harmonics = Math.min(Math.floor(wastedGB) + 1, 5);

        // Create a chord based on file count
        const baseFreq = 110; // A2
        const chord = [baseFreq, baseFreq * 1.5, baseFreq * 1.25]; // Major chord

        chord.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = freq;

            // Add movement
            lfo.frequency.value = 0.1 + (i * 0.05); // Slow movement
            lfoGain.gain.value = 5;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            adsrRef.current.push({ osc, gain });
        });

        return () => {
            adsrRef.current.forEach(({ osc, gain }) => {
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
                setTimeout(() => osc.stop(), 2000);
            });
            adsrRef.current = [];
        };

    }, [scanResult]);

    return null; // Invisible component
};

export default AudioEngine;
