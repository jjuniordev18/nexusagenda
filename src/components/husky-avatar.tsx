'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

interface HuskyAvatarProps {
  isPasswordFocused: boolean;
  eyePosition?: { x: number; y: number };
}

export function HuskyAvatar({ isPasswordFocused, eyePosition = { x: 0, y: 0 } }: HuskyAvatarProps) {
  const pawControls = useAnimation();
  const eyeControls = useAnimation();

  useEffect(() => {
    if (isPasswordFocused) {
      pawControls.start({ y: 0, transition: { type: 'spring', stiffness: 260, damping: 16 } });
      eyeControls.start({ scaleY: 0.08, transition: { duration: 0.1 } });
    } else {
      pawControls.start({ y: 65, transition: { type: 'spring', stiffness: 260, damping: 16 } });
      eyeControls.start({ scaleY: 1, transition: { duration: 0.2 } });
    }
  }, [isPasswordFocused, pawControls, eyeControls]);

  const px = eyePosition.x * 4;
  const py = eyePosition.y * 3;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 300 320" className="w-full h-full">
        <defs>
          <linearGradient id="dk" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#2B4F7A" />
          </linearGradient>
          <linearGradient id="lt" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0F4F8" />
          </linearGradient>
          <linearGradient id="ep" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F8B4C8" />
            <stop offset="100%" stopColor="#F0A0B8" />
          </linearGradient>
        </defs>

        {/* Tail */}
        <path d="M230 230 Q260 200 250 170 Q240 150 220 160 Q210 170 215 190 Q218 210 225 225Z" fill="url(#dk)" />
        <path d="M232 225 Q250 200 245 178 Q238 162 225 168 Q220 175 222 190 Q224 208 228 220Z" fill="#FFF" opacity="0.6" />

        {/* Body */}
        <ellipse cx="150" cy="240" rx="85" ry="65" fill="url(#dk)" />
        <path d="M100 210 Q120 195 150 190 Q180 195 200 210 Q210 240 200 270 Q185 290 150 295 Q115 290 100 270 Q90 240 100 210Z" fill="url(#lt)" />
        <path d="M125 215 Q135 210 145 215" fill="none" stroke="#E0E5EA" strokeWidth="1.5" />
        <path d="M130 225 Q142 220 154 225" fill="none" stroke="#E0E5EA" strokeWidth="1.5" />

        {/* Left Ear */}
        <motion.g initial={{ rotate: 0 }} animate={{ rotate: isPasswordFocused ? -8 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 10 }} style={{ transformOrigin: '100px 120px' }}>
          <path d="M80 140 L55 30 L120 110Z" fill="url(#dk)" />
          <path d="M68 90 L58 45 L95 100Z" fill="#FFF" opacity="0.7" />
          <path d="M82 130 L65 55 L110 110Z" fill="url(#ep)" />
        </motion.g>

        {/* Right Ear */}
        <motion.g initial={{ rotate: 0 }} animate={{ rotate: isPasswordFocused ? 8 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 10 }} style={{ transformOrigin: '200px 120px' }}>
          <path d="M220 140 L245 30 L180 110Z" fill="url(#dk)" />
          <path d="M232 90 L242 45 L205 100Z" fill="#FFF" opacity="0.7" />
          <path d="M218 130 L235 55 L190 110Z" fill="url(#ep)" />
        </motion.g>

        {/* Head */}
        <ellipse cx="150" cy="145" rx="80" ry="72" fill="url(#dk)" />
        <path d="M90 130 Q100 110 125 118 Q140 105 150 112 Q160 105 175 118 Q200 110 210 130 Q215 155 205 175 Q190 195 150 200 Q110 195 95 175 Q85 155 90 130Z" fill="url(#lt)" />
        <path d="M142 85 Q146 100 145 120 Q150 105 155 85Z" fill="#FFF" opacity="0.8" />

        {/* Left Eye */}
        <motion.g animate={eyeControls} style={{ transformOrigin: '120px 140px' }}>
          <ellipse cx="120" cy="140" rx="20" ry="22" fill="#FFF" />
          <motion.circle cx={120 + px * 0.7} cy={140 + py * 0.7} r="14" fill="#1A1A2E" animate={{ cx: 120 + px * 0.7, cy: 140 + py * 0.7 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} />
          <motion.circle cx={120 + px} cy={140 + py} r="7" fill="#0D0D15" animate={{ cx: 120 + px, cy: 140 + py }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} />
          <circle cx={115 + px} cy={134 + py} r="4" fill="#FFF" opacity="0.95" />
          <circle cx={125 + px} cy={144 + py} r="2" fill="#FFF" opacity="0.6" />
          <path d="M100 132 Q120 120 140 132" fill="none" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>

        {/* Right Eye */}
        <motion.g animate={eyeControls} style={{ transformOrigin: '180px 140px' }}>
          <ellipse cx="180" cy="140" rx="20" ry="22" fill="#FFF" />
          <motion.circle cx={180 + px * 0.7} cy={140 + py * 0.7} r="14" fill="#1A1A2E" animate={{ cx: 180 + px * 0.7, cy: 140 + py * 0.7 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} />
          <motion.circle cx={180 + px} cy={140 + py} r="7" fill="#0D0D15" animate={{ cx: 180 + px, cy: 140 + py }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} />
          <circle cx={175 + px} cy={134 + py} r="4" fill="#FFF" opacity="0.95" />
          <circle cx={185 + px} cy={144 + py} r="2" fill="#FFF" opacity="0.6" />
          <path d="M160 132 Q180 120 200 132" fill="none" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>

        {/* Nose */}
        <ellipse cx="150" cy="158" rx="8" ry="5" fill="#2D3436" />
        <ellipse cx="150" cy="156.5" rx="3" ry="1.5" fill="#555" opacity="0.4" />

        {/* Mouth + Tongue */}
        <path d="M150 163 L150 170" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M140 174 Q145 178 150 170" fill="none" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M160 174 Q155 178 150 170" fill="none" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round" />
        <motion.g animate={{ scaleY: isPasswordFocused ? 0 : 1, opacity: isPasswordFocused ? 0 : 1 }} transition={{ duration: 0.2 }} style={{ transformOrigin: '150px 174px' }}>
          <path d="M143 174 Q147 188 150 190 Q153 188 157 174Z" fill="#FF7B9C" />
          <path d="M147 176 Q149 185 150 188" fill="none" stroke="#E85A7A" strokeWidth="0.8" opacity="0.5" />
        </motion.g>

        {/* Cheek blush */}
        <circle cx="100" cy="155" r="10" fill="#FFB0C8" opacity="0.35" />
        <circle cx="200" cy="155" r="10" fill="#FFB0C8" opacity="0.35" />

        {/* Front Paws */}
        <motion.g animate={pawControls} initial={{ y: 65 }}>
          {/* Left paw */}
          <ellipse cx="115" cy="275" rx="28" ry="18" fill="url(#lt)" />
          <ellipse cx="115" cy="275" rx="28" ry="18" fill="none" stroke="#D0D5DB" strokeWidth="1" />
          <ellipse cx="100" cy="272" rx="7" ry="6" fill="#E8EDF2" />
          <ellipse cx="115" cy="268" rx="7" ry="6" fill="#E8EDF2" />
          <ellipse cx="130" cy="272" rx="7" ry="6" fill="#E8EDF2" />
          <ellipse cx="115" cy="280" rx="10" ry="7" fill="#E8EDF2" />
          {/* Right paw */}
          <ellipse cx="185" cy="275" rx="28" ry="18" fill="url(#lt)" />
          <ellipse cx="185" cy="275" rx="28" ry="18" fill="none" stroke="#D0D5DB" strokeWidth="1" />
          <ellipse cx="170" cy="272" rx="7" ry="6" fill="#E8EDF2" />
          <ellipse cx="185" cy="268" rx="7" ry="6" fill="#E8EDF2" />
          <ellipse cx="200" cy="272" rx="7" ry="6" fill="#E8EDF2" />
          <ellipse cx="185" cy="280" rx="10" ry="7" fill="#E8EDF2" />
        </motion.g>
      </svg>
    </div>
  );
}
