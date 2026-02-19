
import React, { useState, useMemo } from 'react';
import { ScanResult, AIRecommendation, ScannedFile, DuplicateGroup } from './types';
import Scanner from './components/Scanner';
import StatCard from './components/ui/StatCard';
import Visuals from './components/Visuals';
import RecommendationPanel from './components/RecommendationPanel';
import { formatBytes } from './utils/format';
import { getStorageInsights } from './services/openaiService';
import { useSound } from './hooks/useSound';
import AudioEngine from './components/audio/AudioEngine';
import { saveScanResult } from './services/storageService';
import { triggerGravityEffect } from './utils/physics';

import FingerprintDNA from './components/ui/FingerprintDNA';

const App: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const { playSound } = useSound();
  const [isScanning, setIsScanning] = useState(false);

  const handleScanComplete = async (result: ScanResult) => {
    setScanResult(result);
    setIsScanning(false);
    playSound('scan');
    saveScanResult(result).catch(console.error);
    setSelectedFileIds(new Set());
    setAiLoading(true);
    try {
      const insight = await getStorageInsights(result);
      setRecommendation(insight);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setRecommendation(null);
    setSelectedFileIds(new Set());
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFileIds(newSelection);
  };

  const toggleGroupSelection = (hash: string, fileIds: string[]) => {
    const duplicates = fileIds.slice(1);
    const allSelected = duplicates.every(id => selectedFileIds.has(id));

    const newSelection = new Set(selectedFileIds);
    if (allSelected) {
      duplicates.forEach(id => newSelection.delete(id));
    } else {
      duplicates.forEach(id => newSelection.add(id));
    }
    setSelectedFileIds(newSelection);
    setSelectedFileIds(newSelection);
    playSound('click');
  };

  const handleSmartSelect = (mode: 'newest' | 'oldest' | 'pattern', pattern?: string) => {
    if (!scanResult) return;
    const newSelection = new Set<string>();

    scanResult.duplicates.forEach(group => {
      const sorted = [...group.files].sort((a, b) => a.lastModified - b.lastModified);
      let toSelect: ScannedFile[] = [];

      if (mode === 'oldest') {
        // Keep newest, select all others (oldest)
        toSelect = sorted.slice(0, sorted.length - 1);
      } else if (mode === 'newest') {
        // Keep oldest, select all others (newest)
        toSelect = sorted.slice(1);
      } else if (mode === 'pattern' && pattern) {
        try {
          const regex = new RegExp(pattern, 'i');
          toSelect = group.files.filter(f => regex.test(f.name));
          // Safety: Don't select ALL files in a group
          if (toSelect.length === group.files.length) {
            toSelect.pop(); // Keep one randomly if pattern matches all
          }
        } catch (e) {
          console.error("Invalid regex", e);
        }
      }

      toSelect.forEach(f => newSelection.add(f.id));
    });

    setSelectedFileIds(newSelection);
    playSound('success');
  };

  const [simulatedDeleteIds, setSimulatedDeleteIds] = useState<string[]>([]);



  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportAsJSON = () => {
    if (!scanResult) return;
    const exportData = {
      summary: {
        totalFiles: scanResult.totalFiles,
        totalSize: formatBytes(scanResult.totalSize),
        wastedSpace: formatBytes(scanResult.wastedSpace),
        duplicateGroups: scanResult.duplicates.length
      },
      aiRecommendation: recommendation,
      duplicateGroups: scanResult.duplicates.map(g => ({
        hash: g.hash,
        wastedSize: formatBytes(g.totalWastedSize),
        files: g.files.map(f => ({
          name: f.name,
          path: f.webkitRelativePath,
          size: formatBytes(f.size),
          lastModified: new Date(f.lastModified).toISOString()
        }))
      }))
    };
    downloadFile(JSON.stringify(exportData, null, 2), 'duplicate-finder-results.json', 'application/json');
    setIsExportDropdownOpen(false);
  };

  const exportAsCSV = () => {
    if (!scanResult) return;
    const headers = ['Group Hash', 'Filename', 'Path', 'Size (Bytes)', 'Status', 'Last Modified'];
    const rows = scanResult.duplicates.flatMap(g =>
      g.files.map((f, i) => [
        g.hash,
        f.name,
        f.webkitRelativePath,
        f.size.toString(),
        i === 0 ? 'Original' : 'Duplicate',
        new Date(f.lastModified).toISOString()
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'duplicate-finder-results.csv', 'text/csv');
    setIsExportDropdownOpen(false);
  };

  const selectedTotalSize = useMemo(() => {
    if (!scanResult) return 0;
    let size = 0;
    scanResult.duplicates.forEach(group => {
      group.files.forEach(file => {
        if (selectedFileIds.has(file.id)) size += file.size;
      });
    });
    return size;
  }, [selectedFileIds, scanResult]);

  // Mouse tracking for reactive background
  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
  };

  const handleSimulatedDelete = () => {
    setIsConfirmingDelete(false);
    const idsToDelete = Array.from(selectedFileIds);

    // Trigger Gravity Effect
    triggerGravityEffect(idsToDelete.map(id => `file-row-${id}`));
    playSound('delete');

    // Wait for animation to finish before removing from state
    setTimeout(() => {
      if (!scanResult) return;

      const newScanResult = { ...scanResult };
      // ... rest of delete logic
      let recoveredSize = 0;

      newScanResult.duplicates = newScanResult.duplicates.map(group => {
        const remainingFiles = group.files.filter(f => !selectedFileIds.has(f.id));
        const deletedFiles = group.files.filter(f => selectedFileIds.has(f.id));

        deletedFiles.forEach(f => recoveredSize += f.size);

        if (remainingFiles.length < 2) {
          // Group dissolved
          return null;
        }

        return {
          ...group,
          files: remainingFiles,
          totalWastedSize: remainingFiles.reduce((acc, f, idx) => idx === 0 ? acc : acc + f.size, 0)
        };
      }).filter(Boolean) as DuplicateGroup[];

      newScanResult.wastedSpace -= recoveredSize;
      setScanResult(newScanResult);
      setSelectedFileIds(new Set());
    }, 800); // Wait for gravity fall
  };


  return (
    <div
      className="min-h-screen flex flex-col relative aurora-bg selection:bg-rose-500/30 overflow-hidden"
      onMouseMove={(e) => {
        handleMouseMove(e);
        // Optional: Hover subtle sound could go here but might be annoying
      }}
    >
      <AudioEngine scanResult={scanResult} isScanning={isScanning} />

      {/* Subtle overlay texture */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-soft-light z-0"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                Data<span className="text-rose-400 font-light">Cleanse</span>
              </h1>
            </div>
          </div>

          {scanResult && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="text-sm px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Export
                </button>
                {isExportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-[60] overflow-hidden backdrop-blur-xl ring-1 ring-white/10">
                    <button onClick={exportAsJSON} className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                      JSON Format
                    </button>
                    <button onClick={exportAsCSV} className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors border-t border-white/5">
                      CSV Format
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={resetScan}
                className="text-sm glass-button px-5 py-2 rounded-lg font-medium shadow-lg hover:shadow-rose-500/20 text-white hover:text-rose-400"
              >
                New Scan
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-32 pb-32 z-10">
        {!scanResult ? (
          <div className="max-w-xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-light tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                Clarity for your <br />
                <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-400 to-indigo-400 animate-pulse">Digital Space</span>
              </h2>
              <p className="text-slate-300 text-lg font-light max-w-md mx-auto leading-relaxed">
                Finds <span className="text-rose-400 font-medium text-glow">100% identical files</span> (byte-for-byte).
                <br />
                Safe cleanup with no guessing game.
              </p>
            </div>
            <Scanner onScanComplete={handleScanComplete} setIsScanning={setIsScanning} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">

            {/* Left Column: Stats & Visuals */}
            <div className="lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  label="Wasted Space"
                  value={formatBytes(scanResult.wastedSpace)}
                  color="red"
                />
                <StatCard
                  label="Duplicates"
                  value={scanResult.duplicates.reduce((acc, g) => acc + g.files.length - 1, 0)}
                  color="amber"
                />
                <StatCard
                  label="Total Size"
                  value={formatBytes(scanResult.totalSize)}
                  color="blue"
                />
                <StatCard
                  label="Scanned Items"
                  value={scanResult.totalFiles}
                  color="green"
                />
              </div>

              {/* Data Visualizations */}
              <div className="glass-card-soft rounded-2xl p-6">
                <Visuals data={scanResult} />
              </div>

              {/* Duplicate List */}
              <div className="glass-card-soft rounded-2xl overflow-hidden p-1">
                <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
                  <h3 className="font-medium text-lg text-slate-200">Duplicate Groups</h3>
                  <div className="flex items-center gap-3">
                    <select
                      onChange={(e) => handleSmartSelect(e.target.value as any)}
                      className="bg-slate-800 border border-white/10 rounded-lg text-xs py-1 px-2 text-slate-400 focus:ring-rose-500 focus:border-rose-500 shadow-sm"
                    >
                      <option value="">Smart Select...</option>
                      <option value="newest">Select Newest (Keep Originals)</option>
                      <option value="oldest">Select Oldest</option>
                    </select>
                    <span className="text-xs font-semibold text-rose-300 bg-rose-500/10 px-3 py-1 rounded-full">{scanResult.duplicates.length} Found</span>
                  </div>
                </div>

                <div className="divide-y divide-white/5 bg-slate-900/40">
                  {scanResult.duplicates.length > 0 ? (
                    scanResult.duplicates.map((group, idx) => {
                      const fileIds = group.files.map(f => f.id);
                      const duplicatesIds = fileIds.slice(1);
                      const areAllDuplicatesInGroupSelected = duplicatesIds.every(id => selectedFileIds.has(id));

                      return (
                        <div key={group.hash} className="p-6 transition-colors hover:bg-white/5">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-4">
                              <div className="pt-1">
                                <input
                                  type="checkbox"
                                  checked={areAllDuplicatesInGroupSelected}
                                  onChange={() => toggleGroupSelection(group.hash, fileIds)}
                                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-offset-slate-900 focus:ring-rose-500 cursor-pointer transition-colors"
                                />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-medium text-slate-200 text-lg truncate max-w-lg">{group.files[0].name}</h4>
                                <div className="flex gap-2 text-xs text-slate-500 items-center">
                                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-white/5">{group.files[0].type || 'Unknown Type'}</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="font-mono text-slate-600">{group.files.length} copies</span>
                                </div>
                              </div>
                            </div>

                            {/* Center: DNA Visualization */}
                            <div className="hidden md:flex flex-col items-end mr-8">
                              <FingerprintDNA hash={group.hash} />
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-semibold text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">-{formatBytes(group.totalWastedSize)}</div>
                            </div>
                          </div>

                          <div className="pl-9 space-y-2">
                            {group.files.map((file, fIdx) => (
                              <div
                                key={file.id}
                                id={`file-row-${file.id}`}
                                className={`flex items-center justify-between text-xs py-2 px-3 rounded-lg transition-all ${fIdx === 0 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-slate-800/50 border border-white/5 hover:border-rose-500/30'}`}
                                onMouseEnter={() => playSound('hover')}
                              >
                                <div className="flex items-center gap-4 truncate">
                                  {fIdx !== 0 ? (
                                    <input
                                      type="checkbox"
                                      checked={selectedFileIds.has(file.id)}
                                      onChange={() => toggleFileSelection(file.id)}
                                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-0 cursor-pointer"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.4)]"></div>
                                    </div>
                                  )}
                                  <span className={`truncate flex-1 font-mono ${fIdx === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{file.webkitRelativePath}</span>
                                </div>
                                <span className={`shrink-0 ml-4 font-semibold uppercase text-[10px] tracking-wide ${fIdx === 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{fIdx === 0 ? 'Original' : 'Duplicate'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-24 text-center">
                      <p className="text-slate-500 font-light">No duplicates found. Your storage is clean!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: AI & Analysis */}
            <div className="lg:col-span-4 space-y-8 h-full">
              <div className="sticky top-32 space-y-8">
                <div className="pb-2 border-b border-white/5">
                  <h3 className="font-medium text-lg text-slate-200">AI Recommendations</h3>
                </div>

                <RecommendationPanel recommendation={recommendation} loading={aiLoading} />
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Floating Action Bar */}
      {selectedFileIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500 w-full max-w-md">
          <div className="glass-card-soft p-2 rounded-2xl flex items-center justify-between pl-6 pr-2 shadow-2xl shadow-rose-500/20 ring-1 ring-white/10">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-white">{selectedFileIds.size} selected</span>
              <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">Recover {formatBytes(selectedTotalSize)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedFileIds(new Set())}
                className="text-slate-400 hover:text-white text-xs font-medium transition-colors px-3 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-5 rounded-xl transition-all text-sm shadow-lg shadow-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={() => setIsConfirmingDelete(false)} />
          <div className="relative glass-panel bg-slate-900 border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 mx-auto shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 text-center">Are you sure?</h3>
            <p className="text-slate-400 mb-8 leading-relaxed text-center">
              You are about to remove <span className="text-white font-bold">{selectedFileIds.size} duplicate files</span>.
              This will free up <span className="text-rose-400 font-bold">{formatBytes(selectedTotalSize)}</span> of space in this view.
              <br /><br />
              <span className="text-xs italic opacity-70 block bg-black/20 p-3 rounded-lg border border-white/5">* Note: This only removes the files from the scan results list. Browsers cannot delete files from your local disk directly.</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleSimulatedDelete}
                className="flex-1 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-rose-500/25"
              >
                Confirm Cleanup
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="flex-1 glass-button text-slate-300 hover:text-white font-bold py-3.5 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/30 backdrop-blur-xl py-8 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center">
          <div className="text-slate-500 text-sm">
            <span>© 2024 Smart Duplicate Finder</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
