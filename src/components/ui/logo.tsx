import * as React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export function Logo({ className, width = 40, height = 40, alt = 'TecBunny Logo' }: LogoProps) {
  return (
    <Image
      src="/brand.png"
      alt={alt}
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
    />
  );
}
