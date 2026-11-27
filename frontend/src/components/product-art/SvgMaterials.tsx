import type { SvgIds } from './useSvgIds';

export function SvgMaterials({ ids, tone }: { ids: SvgIds; tone: string }) {
  const { id } = ids;
  return (
    <defs>
      <linearGradient id={id('ceramic')} x1="0" x2="1">
        <stop offset="0" stopColor="#cfc6ba" />
        <stop offset="0.22" stopColor="#f7f3ed" />
        <stop offset="0.38" stopColor="#ffffff" />
        <stop offset="0.75" stopColor="#e9e2d8" />
        <stop offset="1" stopColor="#b9afa2" />
      </linearGradient>

      <linearGradient id={id('inside')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9d1c6" />
        <stop offset="1" stopColor="#fbf8f4" />
      </linearGradient>

      <radialGradient id={id('saucer')} cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.7" stopColor="#efe9e1" />
        <stop offset="1" stopColor="#c8beb1" />
      </radialGradient>

      <linearGradient id={id('glass')} x1="0" x2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="0.12" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="0.86" stopColor="#ffffff" stopOpacity="0.14" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
      </linearGradient>

      <linearGradient id={id('depth')} x1="0" x2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.38" />
        <stop offset="0.3" stopColor="#000" stopOpacity="0" />
        <stop offset="0.7" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.42" />
      </linearGradient>

      <linearGradient id={id('chrome')} x1="0" x2="1">
        <stop offset="0" stopColor="#6f6f6f" />
        <stop offset="0.2" stopColor="#f4f4f4" />
        <stop offset="0.45" stopColor="#9a9a9a" />
        <stop offset="0.7" stopColor="#e6e6e6" />
        <stop offset="1" stopColor="#5e5e5e" />
      </linearGradient>

      <radialGradient id={id('crema')} cx="0.42" cy="0.4" r="0.65">
        <stop offset="0" stopColor="#5b2a12" />
        <stop offset="0.55" stopColor="#8e4f24" />
        <stop offset="0.9" stopColor="#c48a52" />
        <stop offset="1" stopColor="#a36a3a" />
      </radialGradient>

      <radialGradient id={id('surface')} cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
        <stop offset="0.5" stopColor={tone} stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.25" />
      </radialGradient>

      <filter id={id('shadow')} x="-30%" y="-100%" width="160%" height="300%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id={id('soft')} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="0.5" />
      </filter>
      <filter id={id('steam')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
  );
}
