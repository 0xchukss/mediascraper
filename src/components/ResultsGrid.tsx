'use client';

import ResultCard from './ResultCard';

interface ResultItem {
  id: string;
  source: string;
  title: string;
  type: string;
  thumbnail: string;
  url: string;
  year: string;
  description: string;
  downloadUrl: string;
}

interface ResultsGridProps {
  results: ResultItem[];
  onDownload: (item: ResultItem) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onOpenPlayer: (item: ResultItem) => void;
  downloadedPaths: Record<string, string>;
}

export default function ResultsGrid({ results, onDownload, selectedIds, onSelect, onOpenPlayer, downloadedPaths }: ResultsGridProps) {
  if (results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        No results found. Try a different search term or filter.
      </div>
    );
  }

  return (
    <div className="results-grid">
      {results.map((item) => (
        <ResultCard 
          key={item.id} 
          item={item} 
          onDownload={onDownload} 
          isSelected={selectedIds.has(item.id)}
          onSelect={onSelect}
          onOpenPlayer={onOpenPlayer}
          localPath={downloadedPaths[item.id]}
        />
      ))}
    </div>
  );
}
