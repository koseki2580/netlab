const ATTRIBUTE_NAMES = new Set(['aria-label', 'aria-roledescription', 'placeholder', 'title']);

const ENGLISH_LIKE_RE = /[A-Za-z]{4,}/;

function isLikelyTranslatable(text) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  return ENGLISH_LIKE_RE.test(trimmed);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag hardcoded English strings in already-swept sandbox files; route through useI18n().t() instead.',
    },
    schema: [],
    messages: {
      hardcodedJsxText:
        'Hardcoded JSX text "{{text}}" — replace with {t(\'<key>\')} from useI18n().',
      hardcodedAttribute:
        'Hardcoded JSX attribute {{attr}}="{{text}}" — replace with t(\'<key>\') from useI18n().',
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (!isLikelyTranslatable(node.value)) return;
        context.report({
          node,
          messageId: 'hardcodedJsxText',
          data: { text: node.value.trim().slice(0, 60) },
        });
      },
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return;
        if (!ATTRIBUTE_NAMES.has(node.name.name)) return;
        const value = node.value;
        if (!value || value.type !== 'Literal') return;
        if (!isLikelyTranslatable(value.value)) return;
        context.report({
          node,
          messageId: 'hardcodedAttribute',
          data: {
            attr: node.name.name,
            text: String(value.value).slice(0, 60),
          },
        });
      },
    };
  },
};
