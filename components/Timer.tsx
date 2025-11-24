import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode } from '../types';

export const Timer: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  
  // Settings state (in minutes)
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  
  const [timeLeft, setTimeLeft] = useState(focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Audio Context for beep sound
  const playBeep = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resume context if suspended (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  };

  // Adjust time helper
  const adjustDuration = (type: 'focus' | 'break', amount: number) => {
    if (type === 'focus') {
      setFocusDuration(prev => Math.max(1, Math.min(120, prev + amount)));
      if (mode === TimerMode.FOCUS && !isActive) {
        setTimeLeft(prev => Math.max(60, Math.min(120 * 60, (focusDuration + amount) * 60)));
      }
    } else {
      setBreakDuration(prev => Math.max(1, Math.min(60, prev + amount)));
      if (mode === TimerMode.BREAK && !isActive) {
        setTimeLeft(prev => Math.max(60, Math.min(60 * 60, (breakDuration + amount) * 60)));
      }
    }
  };

  const toggleTimer = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(mode === TimerMode.FOCUS ? focusDuration * 60 : breakDuration * 60);
  }, [mode, focusDuration, breakDuration]);

  const switchMode = useCallback(() => {
    const newMode = mode === TimerMode.FOCUS ? TimerMode.BREAK : TimerMode.FOCUS;
    setMode(newMode);
    setTimeLeft(newMode === TimerMode.FOCUS ? focusDuration * 60 : breakDuration * 60);
    setIsActive(false);
  }, [mode, focusDuration, breakDuration]);

  // Update timeLeft if duration changes while inactive
  useEffect(() => {
    if (!isActive) {
       setTimeLeft(mode === TimerMode.FOCUS ? focusDuration * 60 : breakDuration * 60);
    }
  }, [focusDuration, breakDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let interval: number | null = null;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playBeep(); // Play sound when timer hits 0
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = mode === TimerMode.FOCUS ? focusDuration * 60 : breakDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  const getThemeColor = () => mode === TimerMode.FOCUS ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-500 dark:text-emerald-400';
  const getStrokeColor = () => mode === TimerMode.FOCUS ? 'text-indigo-500' : 'text-emerald-500';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-6 p-4 md:p-8">
      
      {/* Mode Switcher */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
        <button
          onClick={() => mode !== TimerMode.FOCUS && switchMode()}
          className={`px-4 md:px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
            mode === TimerMode.FOCUS 
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Deep Focus
        </button>
        <button
          onClick={() => mode !== TimerMode.BREAK && switchMode()}
          className={`px-4 md:px-6 py-2 text-sm font-semibold rounded-lg transition-all ${
            mode === TimerMode.BREAK 
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Short Break
        </button>
      </div>

      {/* Timer Circle */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
        {/* Simple SVG Circular Progress */}
        <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-slate-100 dark:text-slate-800"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (80 * 1.6)} // Approximate
            pathLength="100"
            strokeDashoffset={100 - progress}
            className={`${getStrokeColor()} transition-all duration-1000 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl md:text-7xl font-bold tracking-tight font-mono ${getThemeColor()} transition-colors`}>
            {formatTime(timeLeft)}
          </span>
          <span className="text-slate-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-widest text-sm">
             {isActive ? 'Running' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-4 w-full max-w-xs">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-lg ${
            isActive 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' 
              : `text-white hover:opacity-90 ${mode === TimerMode.FOCUS ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-500 hover:bg-emerald-600'}`
          }`}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-4 rounded-xl font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Adjust Duration Toggle */}
      <button 
        onClick={() => setIsEditing(!isEditing)}
        className="text-sm text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors underline decoration-dotted"
      >
        {isEditing ? 'Hide Settings' : 'Adjust Timer Duration'}
      </button>

      {/* Duration Settings */}
      {isEditing && (
        <div className="w-full max-w-xs bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Focus Time</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => adjustDuration('focus', -1)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200">-</button>
                    <span className="w-8 text-center font-bold text-slate-800 dark:text-white">{focusDuration}m</span>
                    <button onClick={() => adjustDuration('focus', 1)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200">+</button>
                </div>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Break Time</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => adjustDuration('break', -1)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200">-</button>
                    <span className="w-8 text-center font-bold text-slate-800 dark:text-white">{breakDuration}m</span>
                    <button onClick={() => adjustDuration('break', 1)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200">+</button>
                </div>
            </div>
        </div>
      )}
      
      {!isEditing && (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-xs leading-relaxed">
            {mode === TimerMode.FOCUS 
            ? 'Focus deeply on one task. No distractions.' 
            : 'Step away from the screen. Stretch and breathe.'}
        </p>
      )}
    </div>
  );
};