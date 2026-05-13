const PROPERTY_FILE_RE = /(__properties__\/.*\.test\.[tj]sx?$|\.property\.test\.[tj]sx?$)/;

function hasDirective(sourceCode, directive) {
  const comments = sourceCode.getAllComments();
  return comments.some((comment) => comment.value.includes(directive));
}

function isNumericLiteral(node) {
  return (
    node &&
    ((node.type === 'Literal' && typeof node.value === 'number') ||
      (node.type === 'UnaryExpression' &&
        node.operator === '-' &&
        node.argument?.type === 'Literal' &&
        typeof node.argument.value === 'number'))
  );
}

function numericLiteralValue(node) {
  if (node?.type === 'Literal' && typeof node.value === 'number') {
    return node.value;
  }
  if (
    node?.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument?.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return -node.argument.value;
  }
  return undefined;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require property tests to use the shared seed registry or document explicit seed/numRuns deviations.',
    },
    schema: [],
    messages: {
      literalSeed:
        'Use PROPERTY_SEED_DEFAULT from src/testing/seeds, or document this direct seed with @property-seed.',
      literalNumRuns:
        'Use PROPERTY_NUM_RUNS_DEFAULT from src/testing/seeds, or document this direct numRuns with @property-num-runs.',
    },
  },
  create(context) {
    const filename = context.getFilename().replaceAll('\\', '/');
    if (!PROPERTY_FILE_RE.test(filename)) {
      return {};
    }

    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const allowsSeedDeviation = hasDirective(sourceCode, '@property-seed');
    const allowsNumRunsDeviation = hasDirective(sourceCode, '@property-num-runs');

    return {
      Property(node) {
        const keyName =
          node.key?.type === 'Identifier'
            ? node.key.name
            : node.key?.type === 'Literal'
              ? String(node.key.value)
              : undefined;
        if (keyName === 'seed' && isNumericLiteral(node.value) && !allowsSeedDeviation) {
          context.report({ node: node.value, messageId: 'literalSeed' });
        }
        const numRuns = numericLiteralValue(node.value);
        if (
          keyName === 'numRuns' &&
          isNumericLiteral(node.value) &&
          numRuns !== 100 &&
          !allowsNumRunsDeviation
        ) {
          context.report({ node: node.value, messageId: 'literalNumRuns' });
        }
      },
    };
  },
};
