import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import noHardcodedSandboxString from './eslint-rules/no-hardcoded-sandbox-string.mjs';
import deprecationAnnotations from './eslint-rules/deprecation-annotations.cjs';
import propertyTestSeeds from './eslint-rules/property-test-seeds.cjs';
import noRawLocatorsInE2e from './eslint-rules/no-raw-locators-in-e2e.cjs';

const netlabPlugin = {
  rules: {
    'deprecation-annotations': deprecationAnnotations,
    'no-hardcoded-sandbox-string': noHardcodedSandboxString,
    'property-test-seeds': propertyTestSeeds,
    'no-raw-locators-in-e2e': noRawLocatorsInE2e,
  },
};

// Files already swept for i18n — enforce no-hardcoded-sandbox-string here.
// Add new entries as additional sub-catalogs are extracted.
const I18N_ENFORCED_FILES = [
  'src/components/learning/drillKit.tsx',
  'src/components/learning/SubnetDrillPanel.tsx',
  'src/components/learning/RoutingDrillPanel.tsx',
  'src/components/learning/VisualRoutingDrillPanel.tsx',
  'src/components/learning/SubnetVisual.tsx',
  'src/components/learning/PacketJourneyPanel.tsx',
  'src/components/learning/ResilienceLabPanel.tsx',
  'src/components/learning/ConceptCheckPanel.tsx',
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
      // Relax for now — `any` elimination is tracked separately with type-checked rules
      '@typescript-eslint/no-explicit-any': 'warn',
      // Empty functions are used for default context values — valid pattern
      '@typescript-eslint/no-empty-function': 'off',
      // Non-null assertions on optional chains exist in tested code paths — tightened separately
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
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { netlab: netlabPlugin },
    rules: {
      'netlab/deprecation-annotations': 'error',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // Enforce testid-only locator policy on Playwright specs. The pages/
    // POMs and selectors module sit alongside the specs and follow the
    // same rule. See docs/dev/e2e-locators.md.
    files: ['e2e/**/*.ts'],
    ignores: [
      // a11y-focused specs intentionally exercise the role/aria tree.
      'e2e/a11y.spec.ts',
      'e2e/**/*a11y*.spec.ts',
    ],
    plugins: { netlab: netlabPlugin },
    rules: {
      'netlab/no-raw-locators-in-e2e': 'error',
    },
  },
  {
    files: I18N_ENFORCED_FILES,
    plugins: { netlab: netlabPlugin },
    rules: {
      'netlab/no-hardcoded-sandbox-string': 'error',
    },
  },
  {
    files: ['src/**/__properties__/**/*.test.ts', 'src/**/*.property.test.ts'],
    plugins: { netlab: netlabPlugin },
    rules: {
      'netlab/property-test-seeds': 'error',
    },
  },
  prettierConfig,
);
