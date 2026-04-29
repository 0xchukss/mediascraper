'use client';

import { useState, useEffect } from 'react';
import { ResultItem } from '@/types';

interface Scene {
  id: number;
  text: string;
  keywords: string;
  results: ResultItem[];
  selectedClip: ResultItem | null;
  status: 'idle' | 'searching' | 'matched';
  timeRange: { start: number; end: number };
}

interface ScriptSequencerProps {
  onDownloadScene: (item: ResultItem, start: number, end: number, customName?: string) => Promise<void>;
  isDownloading: (id: string) => boolean;
}

export default function ScriptSequencer({ onDownloadScene, isDownloading }: ScriptSequencerProps) {
  const [script, setScript] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseScript = () => {
    setIsProcessing(true);
    // Split by double newline or specific scene markers
    const segments = script.split(/\n\n+/).filter(s => s.trim().length > 5);
    
    const newScenes: Scene[] = segments.map((text, index) => {
      // Basic keyword extraction: remove common stop words and keep interesting nouns/verbs
      const keywords = text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(' ')
        .filter(w => w.length > 4)
        .slice(0, 5)
        .join(' ');

      return {
        id: index,
        text,
        keywords: keywords || 'vintage',
        results: [],
        selectedClip: null,
        status: 'idle',
        timeRange: { start: 0, end: 5 } // Default 5s clip
      };
    });

    setScenes(newScenes);
    setIsProcessing(false);
    
    // Automatically trigger search for each scene
    newScenes.forEach(scene => searchForScene(scene.id, scene.keywords));
  };

  const searchForScene = async (sceneId: number, keywords: string) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'searching' } : s));
    
    try {
      // Use existing search API
      const response = await fetch(`/api/search?q=${encodeURIComponent(keywords)}&type=video&era=vintage`);
      const data = await response.json();
      const results = data.results || [];

      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return { 
            ...s, 
            results, 
            status: results.length > 0 ? 'matched' : 'idle',
            selectedClip: results[0] || null 
          };
        }
        return s;
      }));
    } catch (error) {
      console.error(`Search failed for scene ${sceneId}:`, error);
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'idle' } : s));
    }
  };

  const updateSceneClip = (sceneId: number, clip: ResultItem) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, selectedClip: clip } : s));
  };

  return (
    <div className="script-sequencer">
      <div className="script-input-area">
        <label style={{ fontWeight: '700', color: 'var(--primary)' }}>Video Script Editor</label>
        <textarea 
          className="script-textarea"
          placeholder="Paste your video script here. Each paragraph will be treated as a separate scene..."
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
        <button 
          className="primary" 
          onClick={parseScript} 
          disabled={isProcessing || !script.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          {isProcessing ? 'Processing...' : 'Generate Sequence'}
        </button>
      </div>

      {scenes.length > 0 && (
        <div className="timeline">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)' }}>Script Timeline ({scenes.length} Scenes)</h3>
          </div>
          
          {scenes.map((scene) => (
            <div key={scene.id} className="scene-card">
              <div className="scene-text">
                <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem' }}>SCENE {scene.id + 1}</div>
                {scene.text}
              </div>

              <div className="scene-clip-selector">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Auto-matched Clips:
                </div>
                <div className="mini-results">
                  {scene.status === 'searching' && <div className="status-badge searching">Searching...</div>}
                  {scene.results.length === 0 && scene.status === 'idle' && <div style={{ fontSize: '0.8rem' }}>No matches found.</div>}
                  {scene.results.map((result) => (
                    <img 
                      key={result.id}
                      src={result.thumbnail}
                      className={`mini-thumb ${scene.selectedClip?.id === result.id ? 'active' : ''}`}
                      onClick={() => updateSceneClip(scene.id, result)}
                      title={result.title}
                    />
                  ))}
                </div>
                
                {scene.selectedClip && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem' }}>
                      Selected: <span style={{ color: 'var(--primary)' }}>{scene.selectedClip.title.substring(0, 30)}...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="scene-actions">
                <div className={`status-badge ${scene.status}`}>
                  {scene.status}
                </div>
                <button 
                  className="primary"
                  style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  disabled={!scene.selectedClip || isDownloading(`${scene.selectedClip.id}_clip`)}
                  onClick={() => {
                    if (scene.selectedClip) {
                      const sanitized = scene.text.substring(0, 15).replace(/[^a-z0-9]/gi, '_');
                      const customName = `Scene_${String(scene.id + 1).padStart(2, '0')}_${sanitized}`;
                      onDownloadScene(scene.selectedClip, scene.timeRange.start, scene.timeRange.end, customName);
                    }
                  }}
                >
                  {isDownloading(`${scene.selectedClip?.id}_clip`) ? 'Downloading...' : 'Download Clip'}
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Default Range: {scene.timeRange.start}s - {scene.timeRange.end}s
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
