import React, { useState } from 'react';

interface FingerprintDNAProps {
    hash: string;
}

const FingerprintDNA: React.FC<FingerprintDNAProps> = ({ hash }) => {
    const [copied, setCopied] = useState(false);

    // Map hex chars (0-F) to distinct neon colors
    const getColor = (char: string) => {
        const map: Record<string, string> = {
            '0': '#f43f5e', // Rose
            '1': '#f43f5e',
            '2': '#fb923c', // Orange
            '3': '#fb923c',
            '4': '#fbbf24', // Amber
            '5': '#fbbf24',
            '6': '#34d399', // Mint
            '7': '#34d399',
            '8': '#10b981', // Emerald
            '9': '#10b981',
            'a': '#3b82f6', // Blue
            'b': '#3b82f6',
            'c': '#8b5cf6', // Violet
            'd': '#8b5cf6',
            'e': '#d946ef', // Fuchsia
            'f': '#d946ef'
        };
        return map[char.toLowerCase()] || '#94a3b8';
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Format hash for display (e.g., A3F9-22B1...)
    const formatHash = (h: string) => {
        return h.toUpperCase().match(/.{1,4}/g)?.join('-').substring(0, 24) + '...';
    };

    // Only visualize first 32 chars to keep it compact but unique enough
    const displayHash = hash.substring(0, 32);

    return (
        <div className="flex flex-col gap-2 w-full max-w-[240px] group cursor-pointer" onClick={copyToClipboard}>
            <div className="flex justify-between items-end text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <div className="flex items-center gap-1 group/info">
                    <span>DNA Identity</span>
                    <div className="w-3 h-3 rounded-full border border-slate-600 flex items-center justify-center text-[8px] text-slate-500 cursor-help">?</div>
                    {/* Tooltip */}
                    <div className="absolute top-0 left-0 mt-6 hidden group-hover/info:block z-50 w-64 bg-slate-800 border border-white/10 p-3 rounded-xl shadow-xl text-[10px] normal-case font-normal text-slate-300 leading-relaxed pointer-events-none">
                        <strong className="text-white block mb-1">How it works:</strong>
                        Each file is scanned using <span className="text-rose-400">SHA-256 Cryptographic Hashing</span>. This generates a unique digital fingerprint based on the file content.
                        <br /><br />
                        If two files have the exact same hash, they are <strong className="text-emerald-400">100% identical byte-for-byte</strong>. No guessing involved.
                    </div>
                </div>
                <span className="text-emerald-400 font-mono">{copied ? 'COPIED!' : '100% MATCH'}</span>
            </div>

            {/* DNA Barcode */}
            <div className="flex h-4 w-full gap-[2px] bg-slate-900/80 p-1 rounded border border-white/10 shadow-inner overflow-hidden relative">
                {/* Scanline effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[50%] -skew-x-12 translate-x-[-150%] animate-[shimmer_2s_infinite]"></div>

                {displayHash.split('').map((char, idx) => (
                    <div
                        key={idx}
                        className="flex-1 h-full rounded-[1px]"
                        style={{
                            backgroundColor: getColor(char),
                            opacity: 0.7 + (Math.random() * 0.3)
                        }}
                    ></div>
                ))}
            </div>

            {/* Formatted Hash String */}
            <div className="flex flex-col gap-0.5" title="Click to copy full hash">
                <span className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Digital Signature</span>
                <code className="text-[10px] font-mono text-rose-300 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10 tracking-wider">
                    {formatHash(hash)}
                </code>
            </div>
        </div>
    );
};

export default FingerprintDNA;
