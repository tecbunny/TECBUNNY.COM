import * as React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 40, height = 40 }: LogoProps) {
  return (
    <Image
      src="/brand.png"
      alt="TecBunny Logo"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
    />
  );
}
