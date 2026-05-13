import type { Catalog } from '../../types';

export const assessment: Catalog = {
  'sandbox.assessment.status.label': 'アセスメントの状態',
  'sandbox.assessment.status.passed': '合格',
  'sandbox.assessment.status.failedTimeout': '時間切れ',
  'sandbox.assessment.status.failedConstraint': '制約違反',
  'sandbox.assessment.status.exited': '終了',
  'sandbox.assessment.status.active': '実行中',
  'sandbox.assessment.progress.label': 'アセスメントのサブゴール進捗',
  'sandbox.assessment.progress.text': '{{passed}} / {{total}} サブゴール',
  'sandbox.assessment.passed.label': 'アセスメント合格',
  'sandbox.assessment.passed.heading': 'アセスメント合格',
  'sandbox.assessment.passed.ready': '提出できます。',
  'sandbox.assessment.passed.body':
    '現在のサンドボックス状態が rubric を満たしている間、提出できます。',
  'sandbox.assessment.submit.text': '提出',
  'sandbox.assessment.submit.prompt': '提出メモ',
  'sandbox.assessment.submitDialog.heading': 'アセスメントを提出',
  'sandbox.assessment.submitDialog.notes': 'メモ',
  'sandbox.assessment.submitDialog.notesLabel': '提出メモ',
  'sandbox.assessment.submitDialog.cancel': 'キャンセル',
  'sandbox.assessment.submitDialog.downloadLabel': 'アセスメント提出ファイルをダウンロード',
} as const;
