import React, { useState } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const [imageError, setImageError] = useState(false);

  // Height mappings based on requested size
  const heightClass =
    size === 'sm' ? 'h-9' : size === 'lg' ? 'h-14' : size === 'xl' ? 'h-18' : 'h-11';

  return (
    <div className={`flex items-center select-none ${className}`}>
      {!imageError ? (
        <img
          src="/assets/aistudio/globalfutura_logo__1__a36d2964.jpeg"
          alt="Global Futura Inc - Be Our Partner"
          className={`${heightClass} w-auto object-contain rounded-md bg-white p-0.5 shadow-xs border border-slate-200 dark:border-slate-700 transition-transform duration-200 hover:scale-105`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            GF
          </div>
          <div className="leading-tight">
            <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight text-sm">GLOBAL FUTURA</span>
            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wider">BE OUR PARTNER</span>
          </div>
        </div>
      )}
    </div>
  );
};

