export const numberFormat = (n: number) =>
  typeof n === 'number'
    ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : String(n);

export function sanitizeHtml(html: string) {
  if (typeof document === 'undefined') return html;

  const div = document.createElement('div');
  div.innerHTML = html || '';

  const scripts = div.getElementsByTagName('script');
  while (scripts.length) {
    const parent = scripts[0].parentNode;
    if (parent) {
      parent.removeChild(scripts[0]);
    } else {
      break;
    }
  }

  const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT, null);
  const toClean: HTMLElement[] = [];
  while (walker.nextNode()) {
    toClean.push(walker.currentNode as HTMLElement);
  }

  toClean.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (/^on[a-z]+/i.test(attr.name)) el.removeAttribute(attr.name);
      if (attr.name === 'href' || attr.name === 'src') {
        if (/^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
      }
    });
  });

  return div.innerHTML;
}

export const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

export const isMobile = () =>
  typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  );