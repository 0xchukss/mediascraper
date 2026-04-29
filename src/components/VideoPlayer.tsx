'use client';

import { useState, useRef, useEffect } from 'react';
import { ResultItem } from '@/types';

interface VideoPlayerProps {
  item: ResultItem;
  onClose: () => void;
  onClip: (start: number, end: number) => void;
}

export default function VideoPlayer({ item, onClose, onClip }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isClipping, setIsClipping] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        const d = videoRef.current?.duration || 0;
        setDuration(d);
        setEndTime(Math.min(d, 10)); // Default 10s clip
      };
      videoRef.current.ontimeupdate = () => {
        setCurrentTime(videoRef.current?.currentTime || 0);
      };
    }
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(e => console.log("Auto-play blocked:", e));
    }
  }, [startTime]);

  const handleClip = async () => {
    setIsClipping(true);
    try {
      await onClip(startTime, endTime);
    } finally {
      setIsClipping(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h3>{item.title}</h3>
        
        <div className="video-wrapper">
          <video 
            ref={videoRef} 
            src={`/api/proxy?url=${encodeURIComponent(item.downloadUrl)}`} 
            controls 
            crossOrigin="anonymous"
          />
        </div>

        <div className="trim-controls">
          <div className="dual-range-container">
            <div className="slider-track" style={{
              left: `${(startTime / duration) * 100}%`,
              right: `${100 - (endTime / duration) * 100}%`
            }} />
            <input 
              type="range" 
              className="slider-input start"
              min="0" 
              max={duration} 
              step="0.1" 
              value={startTime} 
              onChange={(e) => {
                const val = Math.min(Number(e.target.value), endTime - 0.1);
                setStartTime(val);
              }}
            />
            <input 
              type="range" 
              className="slider-input end"
              min="0" 
              max={duration} 
              step="0.1" 
              value={endTime} 
              onChange={(e) => {
                const val = Math.max(Number(e.target.value), startTime + 0.1);
                setEndTime(val);
              }}
            />
          </div>
          <div className="time-labels">
            <span>Start: {startTime.toFixed(1)}s</span>
            <span>End: {endTime.toFixed(1)}s</span>
          </div>
          <div className="trim-info">
            Selected Duration: {(endTime - startTime).toFixed(1)}s
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="primary" 
              onClick={handleClip} 
              disabled={isClipping || (endTime - startTime) <= 0}
              style={{ flex: 2 }}
            >
              {isClipping ? 'Clipping...' : '✂ Clip & Download'}
            </button>
            <button 
              className="secondary-btn" 
              onClick={() => onClip(0, duration)} 
              style={{ flex: 1 }}
            >
              ↓ Full
            </button>
          </div>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.92);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(12px);
            padding: 20px;
          }
          .modal-content {
            background: #111;
            padding: 2.5rem;
            border-radius: 1.5rem;
            max-width: 900px; width: 100%;
            border: 1px solid #444;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          @keyframes modalPop {
            from { transform: scale(0.9) translateY(20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          .close-btn {
            position: absolute; top: 1rem; right: 1rem;
            background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer;
          }
          .video-wrapper {
            width: 100%; aspect-ratio: 16/9; background: #000; margin: 1rem 0;
            border-radius: 0.5rem; overflow: hidden;
          }
          video { width: 100%; height: 100%; }
          .trim-controls {
            display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem;
          }
          
          .dual-range-container {
            position: relative;
            height: 40px;
            width: 100%;
          }
          .slider-track {
            position: absolute;
            height: 6px;
            background: var(--primary);
            top: 50%;
            transform: translateY(-50%);
            border-radius: 3px;
            z-index: 1;
          }
          .dual-range-container::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 6px;
            background: #333;
            top: 50%;
            transform: translateY(-50%);
            border-radius: 3px;
          }
          .slider-input {
            position: absolute;
            width: 100%;
            background: none;
            pointer-events: none;
            -webkit-appearance: none;
            top: 50%;
            transform: translateY(-50%);
            margin: 0;
            z-index: 2;
          }
          .slider-input::-webkit-slider-thumb {
            pointer-events: auto;
            -webkit-appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            border: 2px solid var(--primary);
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
          }
          .slider-input::-moz-range-thumb {
            pointer-events: auto;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            border: 2px solid var(--primary);
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
          }
          
          .time-labels {
            display: flex; justify-content: space-between; color: #aaa; font-size: 0.9rem;
          }
          .trim-info { text-align: center; font-weight: bold; color: var(--primary); }
          .secondary-btn {
            background: #333; color: #fff; border: 1px solid #444; border-radius: 0.75rem;
            font-weight: 600; cursor: pointer; transition: all 0.2s;
          }
          .secondary-btn:hover { background: #444; border-color: #555; }
        `}</style>
      </div>
    </div>
  );
}
