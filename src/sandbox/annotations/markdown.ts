import { createElement, type ReactElement, type ReactNode } from 'react';

type Marker = '**' | '_' | '`';

function parseInline(source: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let index = 0;

  while (index < source.length) {
    const marker: Marker | '' = source.startsWith('**', index)
      ? '**'
      : source[index] === '_' || source[index] === '`'
        ? (source[index] as Marker)
        : '';
    if (marker) {
      const offset = marker.length;
      const close = source.indexOf(marker, index + offset);
      if (close !== -1) {
        const key = `${keyPrefix}${index}`;
        parts.push(
          createElement(
            marker === '**' ? 'strong' : marker === '_' ? 'em' : 'code',
            { key },
            marker === '`'
              ? source.slice(index + offset, close)
              : parseInline(source.slice(index + offset, close), key),
          ),
        );
        index = close + offset;
        continue;
      }
    } else if (source[index] === '\n') {
      parts.push(createElement('br', { key: `${keyPrefix}n${index}` }));
      index += 1;
      continue;
    }

    parts.push(source[index] ?? '');
    index += 1;
  }

  return parts;
}

export function renderMarkdown(source: string): ReactElement {
  return createElement('span', null, parseInline(source, 'a'));
}
