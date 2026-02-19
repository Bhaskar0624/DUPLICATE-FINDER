import React, { useRef, useState, useEffect } from 'react';
import { ScanResult, ScannedFile, DuplicateGroup } from '../types';

interface ScannerProps {
  onScanComplete: (result: ScanResult) => void;
  setIsScanning?: (scanning: boolean) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, setIsScanning: setParentScanning }) => {
  const [matchType, setMatchType] = useState<'exact' | 'visual'>('exact');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]); // Staging area
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const exactWorkerRef = useRef<Worker | null>(null);
  const visualWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Workers
    exactWorkerRef.current = new Worker(new URL('../workers/hash.worker.ts', import.meta.url), { type: 'module' });
    visualWorkerRef.current = new Worker(new URL('../workers/imageHash.worker.ts', import.meta.url), { type: 'module' });

    return () => {
      exactWorkerRef.current?.terminate();
      visualWorkerRef.current?.terminate();
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Append new files to staging
    const newFiles = Array.from(files);
    setStagedFiles(prev => [...prev, ...newFiles]);

    // Reset input so validation triggers if selecting same folder again
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (filesInputRef.current) filesInputRef.current.value = '';
  };

  const startScan = async () => {
    if (stagedFiles.length === 0) return;

    setIsScanning(true);
    setParentScanning?.(true);
    setProgress(0);
    setStatus(matchType === 'exact' ? 'Checking Digital DNA...' : 'Analyzing Visual Content...');

    // Convert FileList to Array for easier handling
    const fileList = stagedFiles;
    const totalFiles = fileList.length;
    let processedCount = 0;

    const fileMap = new Map<string, ScannedFile[]>();
    const scannedFiles: ScannedFile[] = [];
    let totalSize = 0;

    // Process files in chunks to avoid overwhelming the worker queue
    const CHUNK_SIZE = 50;

    // Helper to process a chunk
    const processChunk = async (chunk: File[]) => {
      const promises = chunk.map(file => {
        return new Promise<void>((resolve) => {
          const id = Math.random();

          // Determine which worker to use
          const isImage = file.type.startsWith('image/');
          const useVisualWorker = matchType === 'visual' && isImage;
          const targetWorker = useVisualWorker ? visualWorkerRef.current : exactWorkerRef.current;

          const handler = (e: MessageEvent) => {
            if (e.data.id === id) {
              const hash = e.data.hash || `err-${Math.random()}`; // Fallback if error

              const scannedFile: ScannedFile = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                // path removed to match interface
                size: file.size,
                type: file.type || 'unknown',
                lastModified: file.lastModified,
                webkitRelativePath: file.webkitRelativePath || file.name,
                hash: hash
              };

              scannedFiles.push(scannedFile);
              totalSize += file.size;

              if (fileMap.has(hash)) {
                fileMap.get(hash)?.push(scannedFile);
              } else {
                fileMap.set(hash, [scannedFile]);
              }

              processedCount++;
              setProgress(Math.round((processedCount / totalFiles) * 100));
              setStatus(`Scanning: ${file.name}`);

              targetWorker?.removeEventListener('message', handler);
              resolve();
            } else if (e.data.error && useVisualWorker) {
              // If visual worker fails (e.g. not an image), fallback to exact? 
              // For now, let's just treat as unique/error
              targetWorker?.removeEventListener('message', handler);
              resolve();
            }
          };

          targetWorker?.addEventListener('message', handler);
          targetWorker?.postMessage({ id, file });
        });
      });

      await Promise.all(promises);
    };

    // Execute chunks
    for (let i = 0; i < fileList.length; i += CHUNK_SIZE) {
      const chunk = fileList.slice(i, i + CHUNK_SIZE);
      await processChunk(chunk);
    }

    setStatus('Finalizing results...');

    // Identify Duplicates
    const duplicates: DuplicateGroup[] = [];
    let wastedSpace = 0;
    let uniqueCount = 0;

    fileMap.forEach((groupFiles, hash) => {
      if (groupFiles.length > 1) {
        // Calculate wasted space (total size - size of one instance)
        const groupTotalSize = groupFiles.reduce((acc, f) => acc + f.size, 0);
        const singleFileSize = groupFiles[0].size;
        const groupWastedSize = groupTotalSize - singleFileSize;

        duplicates.push({
          hash,
          files: groupFiles,
          totalWastedSize: groupWastedSize
        });
        wastedSpace += groupWastedSize;
      }
      uniqueCount++;
    });

    // Sort by wasted space (descending)
    duplicates.sort((a, b) => b.totalWastedSize - a.totalWastedSize);

    const result: ScanResult = {
      totalFiles,
      totalSize,
      uniqueCount,
      duplicates,
      wastedSpace
    };

    // Simulate a small delay for the "Complete" animation if needed
    setTimeout(() => {
      onScanComplete(result);
      setIsScanning(false);
      setStagedFiles([]); // Clear staging
      setStatus('');
    }, 500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light mb-3 text-center tracking-tight text-white">
          Analyze Storage
        </h2>
        <p className="text-slate-400 text-center mb-10 max-w-sm font-light leading-relaxed mx-auto">
          Select a folder to scan. Works with <span className="text-white font-medium">Images, Documents, Scans, & Videos</span>.
          <br /><span className="text-xs opacity-70 mt-2 block">Files are processed locally. <span className="text-rose-400 font-medium">Ignores filenames</span> — checks File DNA.</span>
        </p>

        {/* Scan Mode Toggle */}
        {!isScanning && (
          <div className="flex justify-center mb-8">
            <div className="bg-slate-900/50 p-1 rounded-full border border-white/5 flex relative">
              <button
                onClick={() => setMatchType('exact')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all z-10 ${matchType === 'exact'
                    ? 'text-white shadow-lg bg-rose-500'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                Exact Match (Strict)
              </button>
              <button
                onClick={() => setMatchType('visual')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all z-10 ${matchType === 'visual'
                    ? 'text-white shadow-lg bg-blue-500'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                Visual Match (AI)
              </button>
            </div>
          </div>
        )}
      </div>

      {!isScanning && stagedFiles.length === 0 ? (

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Option 1: Select Folder */}
          <label className="cursor-pointer glass-button px-8 py-4 rounded-xl text-sm font-medium tracking-wide shadow-lg hover:shadow-rose-500/20 text-slate-300 hover:text-white transition-all flex items-center gap-2 group">
            <svg className="w-5 h-5 text-rose-400 group-hover:text-rose-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Select Folder
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
              // @ts-ignore
              webkitdirectory=""
              directory=""
            />
          </label>

          <span className="text-slate-600 text-sm font-medium">OR</span>

          {/* Option 2: Select Files */}
          <label className="cursor-pointer glass-button px-8 py-4 rounded-xl text-sm font-medium tracking-wide shadow-lg hover:shadow-blue-500/20 text-slate-300 hover:text-white transition-all flex items-center gap-2 group">
            <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Select Images / Files
            <input
              ref={filesInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt" // Optional hints, but allow all
              onChange={handleFileChange}
            />
          </label>
        </div>
      ) : !isScanning && stagedFiles.length > 0 ? (
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
          {/* Staged Files Counter */}
          <div className="flex items-center gap-4 bg-slate-800/50 px-6 py-3 rounded-xl border border-white/5 shadow-2xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white">{stagedFiles.length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">File{stagedFiles.length !== 1 ? 's' : ''} Ready</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4">
            {/* Add More Folder */}
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-lg text-sm font-medium transition-colors border border-white/5 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Add Folder
              <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileChange}
                // @ts-ignore
                webkitdirectory=""
                directory=""
              />
            </label>

            {/* Add More Files */}
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-lg text-sm font-medium transition-colors border border-white/5 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add Files
              <input
                ref={filesInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
            </label>

            {/* Start Scan Button */}
            <button
              onClick={startScan}
              className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-lg text-sm font-bold tracking-wide shadow-lg shadow-rose-500/25 transition-all transform hover:scale-105 animate-pulse"
            >
              Start Scan
            </button>
          </div>

          <button onClick={() => setStagedFiles([])} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4">
            Clear and Start Over
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center py-8">
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            {/* Sonar Rings - Neon Pink/Purple */}
            <div className="absolute inset-0 border border-rose-500/30 rounded-full animate-sonar" style={{ animationDelay: '0s' }}></div>
            <div className="absolute inset-0 border border-purple-500/30 rounded-full animate-sonar" style={{ animationDelay: '0.6s' }}></div>
            <div className="absolute inset-0 border border-rose-500/30 rounded-full animate-sonar" style={{ animationDelay: '1.2s' }}></div>

            {/* Center Display */}
            <div className="w-32 h-32 bg-slate-900/80 backdrop-blur-md rounded-full flex flex-col items-center justify-center border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.3)] z-10 relative overflow-hidden ring-1 ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-purple-500/10"></div>
              <span className="text-3xl font-light text-white font-mono z-10">{progress}%</span>
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1 z-10">Scanning</span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 max-w-[200px] truncate animate-pulse text-center">{status}</span>
        </div>
      )
      }
    </div >
  );
};

export default Scanner;
