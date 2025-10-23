const generateDeterministicColor = (seed: string, alpha: string = 'BB'): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const r = (hash & 0xFF0000) >> 16;
  const g = (hash & 0x00FF00) >> 8;
  const b = hash & 0x0000FF;
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${alpha}`;
};

export const getRegionColor = (regionData: any): string => {
  if (regionData && regionData.color) {
    return regionData.color.length === 7 ? regionData.color + 'BB' : regionData.color;
  }
  
  const seed = regionData?.region_name || `region_${regionData?.id || 'unknown'}`;
  return generateDeterministicColor(seed);
};

const isValidColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/.test(color);
};

export const getSafeColor = (color: string, defaultColor: string = '#FF6D00'): string => {
  return isValidColor(color) ? color : defaultColor;
};

export const getHeatmapColor = (
  normalizedValue: number, 
  baseColor: string = '#FF6D00',
  opacity: number = 0.9
): string => {
  const safeOpacity = Math.max(0.8, Math.min(1, opacity));
  
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  const newLightness = 0.9 - (normalizedValue * 0.8);
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let newR, newG, newB;
  if (s === 0) {
    newR = newG = newB = newLightness;
  } else {
    const q = newLightness < 0.5 ? newLightness * (1 + s) : newLightness + s - newLightness * s;
    const p = 2 * newLightness - q;
    newR = hue2rgb(p, q, h + 1/3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  const color = `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  
  return `${color}${Math.round(safeOpacity * 255).toString(16).padStart(2, '0')}`;
};

export const darkenColor = (color: string, factor: number = 0.2): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const darkenedR = Math.max(0, Math.floor(r * (1 - factor)));
  const darkenedG = Math.max(0, Math.floor(g * (1 - factor)));
  const darkenedB = Math.max(0, Math.floor(b * (1 - factor)));
  
  return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
};