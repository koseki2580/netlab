import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { AnnotationAuthor } from '../../../sandbox/annotations/types';
import { renderMarkdown } from '../../../sandbox/annotations/markdown';

type AuthorFilter = 'all' | AnnotationAuthor;

export function AnnotationListPanel() {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const [author, setAuthor] = useState<AuthorFilter>('all');
  const [query, setQuery] = useState('');
  const annotations = sandbox.engine.snapshot.annotations;

  const needle = query.trim().toLowerCase();
  const visible = annotations.filter((annotation) => {
    if (author !== 'all' && annotation.author !== author) return false;
    return needle.length === 0 || annotation.content.toLowerCase().includes(needle);
  });

  return (
    <section aria-label={t('sandbox.annotations.list.label')}>
      <div>
        <select
          aria-label={t('sandbox.annotations.list.filter')}
          value={author}
          onChange={(event) => setAuthor(event.currentTarget.value as AuthorFilter)}
        >
          <option value="all">{t('sandbox.annotations.list.all')}</option>
          <option value="scenario">{t('sandbox.annotations.list.scenario')}</option>
          <option value="user">{t('sandbox.annotations.list.user')}</option>
        </select>
        <input
          aria-label={t('sandbox.annotations.list.search.label')}
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
          placeholder={t('sandbox.annotations.list.search.placeholder')}
        />
      </div>
      {visible.length === 0 ? (
        <p>{t('sandbox.annotations.list.empty')}</p>
      ) : (
        <ol>
          {visible.map((annotation) => (
            <li
              key={annotation.id}
              data-testid="annotation-list-item"
              tabIndex={0}
              aria-label={t('sandbox.annotations.list.item.label', {
                author: annotation.author,
                traceEventId: annotation.traceEventId,
              })}
            >
              <div>
                {t('sandbox.annotations.list.item.meta', {
                  author: annotation.author,
                  createdAt: annotation.createdAt,
                  traceEventId: annotation.traceEventId,
                })}
              </div>
              <div>{renderMarkdown(annotation.content)}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
