function tagPattern(tag) {
  return new RegExp(`@${tag}\\b`);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require actionable removal timing and migration tags on every @deprecated JSDoc block.',
    },
    schema: [],
    messages: {
      missingRemoveAt:
        '@deprecated JSDoc must include @removeAt v<minor> so removals have a release runway.',
      missingMigrate:
        '@deprecated JSDoc must include @migrate <replacement> so consumers know the migration path.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (!tagPattern('deprecated').test(comment.value)) continue;
          if (!tagPattern('removeAt').test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'missingRemoveAt' });
          }
          if (!tagPattern('migrate').test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'missingMigrate' });
          }
        }
      },
    };
  },
};
