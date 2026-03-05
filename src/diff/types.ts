export interface Hunk {
  id: string;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface FileDiff {
  filePath: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  hunks: Hunk[];
}

export interface DiffResult {
  files: FileDiff[];
  rawDiff: string;
}
