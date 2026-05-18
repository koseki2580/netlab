import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { parseTraceFilter, type TraceFilterResult } from './parser';

export const TRACE_FILTER_PARAM = 'trace_filter';
const DEBOUNCE_MS = 300;

export interface TraceFilterInputProps {
  readonly onParse: (result: TraceFilterResult) => void;
}

export function TraceFilterInput({ onParse }: TraceFilterInputProps) {
  const inputId = useId();
  const statusId = useId();
  const [value, setValue] = useState(() => readTraceFilterFromUrl());
  const [result, setResult] = useState<TraceFilterResult>(() => parseTraceFilter(value));
  const debounceRef = useRef<number | null>(null);
  const error = result.ok ? null : result.error;
  const describedBy = useMemo(() => statusId, [statusId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = parseTraceFilter(value);
      setResult(next);
      onParse(next);
      if (next.ok) {
        writeTraceFilterToUrl(value);
      }
    }, DEBOUNCE_MS);
    debounceRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (debounceRef.current === timer) {
        debounceRef.current = null;
      }
    };
  }, [onParse, value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 10px 0' }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: 10, color: 'var(--netlab-text-secondary)', fontFamily: 'monospace' }}
      >
        Display filter
      </label>
      <input
        id={inputId}
        role="searchbox"
        aria-label="Trace display filter"
        data-testid="trace-filter-searchbox"
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : 'false'}
        type="search"
        value={value}
        placeholder="protocol == tcp && tcp.port == 80"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            if (debounceRef.current !== null) {
              window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            const cleared = parseTraceFilter('');
            setResult(cleared);
            onParse(cleared);
            writeTraceFilterToUrl('');
            setValue('');
          }
        }}
        className="netlab-focus-ring"
        style={{
          height: 28,
          borderRadius: 4,
          border: `1px solid ${error ? 'var(--netlab-accent-red)' : 'var(--netlab-border)'}`,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '0 8px',
        }}
      />
      <div
        id={statusId}
        role={error ? 'alert' : undefined}
        style={{
          minHeight: 14,
          fontSize: 10,
          color: error ? 'var(--netlab-accent-red)' : 'var(--netlab-text-muted)',
          fontFamily: 'monospace',
        }}
      >
        {error ? `Parse error at column ${error.context?.column}: ${error.message}` : ' '}
      </div>
    </div>
  );
}

function readTraceFilterFromUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return new URLSearchParams(window.location.search).get(TRACE_FILTER_PARAM) ?? '';
}

function writeTraceFilterToUrl(value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (value.trim()) {
    params.set(TRACE_FILTER_PARAM, value);
  } else {
    params.delete(TRACE_FILTER_PARAM);
  }
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
}
