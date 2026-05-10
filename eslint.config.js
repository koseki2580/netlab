import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import noHardcodedSandboxString from './eslint-rules/no-hardcoded-sandbox-string.mjs';

const netlabPlugin = {
  rules: {
    'no-hardcoded-sandbox-string': noHardcodedSandboxString,
  },
};

// Files already swept by plan/80 — enforce no-hardcoded-sandbox-string here.
// Add new entries as additional sub-catalogs are extracted.
const I18N_ENFORCED_FILES = [
  'src/components/sandbox/SandboxPanel.tsx',
  'src/components/sandbox/EmptySandboxTab.tsx',
  'src/components/sandbox/SandboxIntroOverlay.tsx',
  'src/components/sandbox/EditsTab.tsx',
  'src/components/sandbox/EditPopover.tsx',
  'src/components/sandbox/BeforeAfterView.tsx',
  'src/components/sandbox/DiffTimeline.tsx',
  'src/components/sandbox/EditListItem.tsx',
  'src/components/sandbox/ImportDialog.tsx',
  'src/components/sandbox/ImportPreview.tsx',
  'src/components/sandbox/LargeTopologyWarning.tsx',
  'src/components/sandbox/PacketEditForm.tsx',
  'src/components/sandbox/ParametersTab.tsx',
  'src/components/sandbox/PcapDownloadButton.tsx',
  'src/components/sandbox/ProposalPendingIndicator.tsx',
  'src/components/sandbox/SandboxActiveEditor.tsx',
  'src/components/sandbox/SandboxErrorBoundary.tsx',
  'src/components/sandbox/SandboxNodeTabBody.tsx',
  'src/components/sandbox/ShortcutsHelpModal.tsx',
  'src/components/sandbox/TrafficTab.tsx',
  'src/components/sandbox/annotations/AnnotationEditorPopover.tsx',
  'src/components/sandbox/annotations/AnnotationListPanel.tsx',
  'src/components/sandbox/annotations/TraceAnnotationCallout.tsx',
  'src/components/sandbox/editors/AclEditorForm.tsx',
  'src/components/sandbox/editors/LinkEditorForm.tsx',
  'src/components/sandbox/editors/MtuEditorForm.tsx',
  'src/components/sandbox/editors/NatEditorForm.tsx',
  'src/components/sandbox/editors/RouteEditorForm.tsx',
  'src/components/sandbox/recording/DesyncWarning.tsx',
  'src/components/sandbox/recording/RecordingMetadataEditor.tsx',
  'src/components/sandbox/recording/ReplayScrubber.tsx',
  'src/components/sandbox/snapshots/EditChainInspector.tsx',
  'src/components/sandbox/snapshots/GoToSnapshotButton.tsx',
  'src/components/sandbox/snapshots/SaveSnapshotButton.tsx',
  'src/components/sandbox/snapshots/SnapshotCompareView.tsx',
  'src/components/sandbox/snapshots/SnapshotListItem.tsx',
  'src/components/sandbox/snapshots/SnapshotListSection.tsx',
  'src/components/assessments/AssessmentTab.tsx',
  'src/components/assessments/PassCelebration.tsx',
  'src/components/assessments/SubgoalListItem.tsx',
  'src/components/assessments/SubmitDialog.tsx',
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-demo/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/**',
      '.claude/**',
      '.husky/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      'vite.config.ts',
      'vite.demo.config.ts',
    ],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { react: reactPlugin, 'react-hooks': reactHooksPlugin },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      // Only enable classic hooks rules, not React Compiler rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      // Relax for now — plan/42 addresses `any` elimination with type-checked rules
      '@typescript-eslint/no-explicit-any': 'warn',
      // Empty functions are used for default context values — valid pattern
      '@typescript-eslint/no-empty-function': 'off',
      // Non-null assertions on optional chains exist in tested code paths — plan/42 tightens
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      // Allow underscore-prefixed unused vars (destructuring patterns)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: I18N_ENFORCED_FILES,
    plugins: { netlab: netlabPlugin },
    rules: {
      'netlab/no-hardcoded-sandbox-string': 'error',
    },
  },
  prettierConfig,
);
