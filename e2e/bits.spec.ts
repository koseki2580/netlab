import { answerOf, generateRound, WEIGHTS } from '../demo/learning/bits';
import { expect, test } from './fixtures/harness';

/** REQ-367 — bits and bytes: a round of mixed questions, answered with the bits or by typing (TC-1753). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1753: a mixed round is answered, each answer is worked out, and the round is summed up', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/learning/bits?seed=7');
  const round = generateRound(7);
  for (const [index, question] of round.entries()) {
    await expect(page.getByTestId('bits-question')).toHaveAttribute('data-kind', question.kind);
    const answer = answerOf(question);
    if (question.kind === 'to-binary') {
      for (const [bit, weight] of WEIGHTS.entries()) {
        if (answer[bit] === '1') await page.getByTestId(`bits-bit-${weight}`).click();
      }
      await expect(page.getByTestId('bits-sum')).toContainText(String(question.value));
    } else {
      // The first answer typed is wrong on purpose: the working is shown either way.
      await page.getByTestId('bits-answer').fill(index === 1 ? '999' : answer);
    }
    await page.getByTestId('bits-check').click();
    const feedback = page.getByTestId('bits-feedback');
    await expect(feedback).toHaveAttribute(
      'data-correct',
      index === 1 && question.kind !== 'to-binary' ? 'false' : 'true',
    );
    await expect(feedback).toContainText(' = ');
    await page.getByTestId('bits-next').click();
  }
  const wrong = round[1]?.kind === 'to-binary' ? 0 : 1;
  await expect(page.getByTestId('bits-summary')).toContainText(
    `${round.length - wrong} / ${round.length}`,
  );
});
