import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // WCAG 2.1 AA. Story-level overrides may add `disabledRules`
      // with documented justification (see docs/dev/storybook.md).
      config: {},
      // Block CI / fail the story when axe-core finds violations.
      test: 'error',
    },
  },
};

export default preview;
