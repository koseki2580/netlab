import type {
  AssessmentHintUsage,
  AssessmentSubgoal,
  AssessmentSubgoalResult,
} from '../../assessments/types';

export interface SubgoalListItemProps {
  readonly subgoal: AssessmentSubgoal;
  readonly result: AssessmentSubgoalResult | undefined;
  readonly hintsUsed: readonly AssessmentHintUsage[];
  readonly onUseHint: (subgoalId: string) => void;
}

export function SubgoalListItem({ subgoal, result, hintsUsed, onUseHint }: SubgoalListItemProps) {
  const usedForSubgoal = hintsUsed.filter((hint) => hint.subgoalId === subgoal.id);
  const revealedHints = subgoal.hints.filter((hint) =>
    usedForSubgoal.some((used) => used.tier === hint.tier),
  );
  const nextHint = subgoal.hints[usedForSubgoal.length] ?? null;
  const passed = result?.passed === true;

  return (
    <li>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div>{subgoal.title}</div>
          <div>{subgoal.required ? 'Required' : 'Bonus'}</div>
        </div>
        <span aria-label={passed ? 'Sub-goal passed' : 'Sub-goal not yet passed'}>
          {passed ? 'Passed' : 'Not yet'}
        </span>
      </div>

      {revealedHints.length > 0 ? (
        <ol>
          {revealedHints.map((hint) => (
            <li key={hint.tier}>{hint.content}</li>
          ))}
        </ol>
      ) : null}

      {subgoal.hints.length > 0 ? (
        <button
          type="button"
          data-subgoal-id={subgoal.id}
          disabled={!nextHint}
          onClick={() => onUseHint(subgoal.id)}
          className="netlab-focus-ring"
        >
          {nextHint ? `Show hint ${nextHint.tier}` : 'All hints shown'}
        </button>
      ) : null}
    </li>
  );
}
