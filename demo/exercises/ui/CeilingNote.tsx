import { Link } from 'react-router-dom';
import { useT } from '../../localeContext';
import type { CycleComparison } from '../store/studyCycle';
import { LINK } from './styles';

/**
 * Both sets solved in full: the comparison cannot show anything, and the
 * honest reading is that the level may be too easy. Said with a way on.
 */
export function CeilingNote({ report }: { report: CycleComparison }) {
  const t = useT();
  const full = (set: CycleComparison['before']) => set.total > 0 && set.solved === set.total;
  if (!report.afterComplete || !full(report.before) || !full(report.after)) return null;
  const next = report.level + 1;
  return (
    <p data-testid={`exercises-cycle-ceiling-${report.cycleId}`} style={{ margin: 0 }}>
      {t(
        'You solved every exercise both before and after, so this level may be too easy for you.',
        '学ぶ前も学んだあとも、全問解けました。このレベルは、やさしすぎるかもしれません。',
      )}{' '}
      {next <= 4 ? (
        <Link to={`/exercises/level/${next}`} style={LINK}>
          {t(`Look at level ${next} →`, `レベル ${next} を見る →`)}
        </Link>
      ) : null}
    </p>
  );
}
