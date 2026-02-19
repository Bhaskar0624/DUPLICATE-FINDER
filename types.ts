
export interface ScannedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  hash: string;
  webkitRelativePath: string;
}

export interface DuplicateGroup {
  hash: string;
  files: ScannedFile[];
  totalWastedSize: number;
}

export interface ScanResult {
  totalFiles: number;
  totalSize: number;
  duplicates: DuplicateGroup[];
  wastedSpace: number;
  uniqueCount: number;
}

export interface AIRecommendation {
  summary: string;
  suggestions: string[];
  priority: 'low' | 'medium' | 'high';
}
