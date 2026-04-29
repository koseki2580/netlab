import { useState } from 'react';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { AnnotationAuthor } from '../../../sandbox/annotations/types';
import { renderMarkdown } from '../../../sandbox/annotations/markdown';

type AuthorFilter = 'all' | AnnotationAuthor;

export function AnnotationListPanel() {
  const sandbox = useSandbox();
  const [author, setAuthor] = useState<AuthorFilter>('all');
  const [query, setQuery] = useState('');
  const annotations = sandbox.engine.snapshot.annotations;

  const needle = query.trim().toLowerCase();
  const visible = annotations.filter((annotation) => {
    if (author !== 'all' && annotation.author !== author) return false;
    return needle.length === 0 || annotation.content.toLowerCase().includes(needle);
  });

  return (
    <section aria-label="Annotations">
      <div>
        <select
          aria-label="Filter annotations"
          value={author}
          onChange={(event) => setAuthor(event.currentTarget.value as AuthorFilter)}
        >
          <option value="all">All</option>
          <option value="scenario">Scenario</option>
          <option value="user">User</option>
        </select>
        <input
          aria-label="Search annotations"
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search"
        />
      </div>
      {visible.length === 0 ? (
        <p>No annotations</p>
      ) : (
        <ol>
          {visible.map((annotation) => (
            <li
              key={annotation.id}
              data-testid="annotation-list-item"
              tabIndex={0}
              aria-label={`Annotation by ${annotation.author} for ${annotation.traceEventId}`}
            >
              <div>
                {annotation.author} · step {annotation.createdAt} · {annotation.traceEventId}
              </div>
              <div>{renderMarkdown(annotation.content)}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
