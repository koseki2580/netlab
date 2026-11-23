/** The starter app, its comments and its `/` hint in the reader's language; the routes are the same in both. */
export function starterApp(locale: 'en' | 'ja'): string {
  const ja = locale === 'ja';
  return `${ja ? '// www の Web サーバです。起動してから、端末で次を打ってください：' : "// www's web server. Press Start, then in the terminal:"}
//   curl http://www.example.test/hello?name=Ada
//   curl -v http://www.example.test/big
let visits = 0;

app.get('/', (req, res) => {
  res.send('${ja ? 'www のアプリが動いています。/hello?name=Ada・/users/1・/big も試してください。' : 'The app on www is running. Try /hello?name=Ada, /users/1 and /big.'}');
});

app.get('/hello', (req, res) => {
  visits += 1;
  res.send('Hello ' + (req.query.name ?? 'world') + ' (visit ' + visits + ')');
});

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'user ' + req.params.id });
});

${ja ? '// 約 3 KB：1 つの TCP セグメント（最大 1400 バイト）には収まりません。' : '// About 3 KB: more than one TCP segment (at most 1400 bytes each).'}
app.get('/big', (req, res) => {
  const lines = [];
  for (let i = 1; i <= 60; i += 1) lines.push('line ' + String(i).padStart(2, '0') + ' ' + '-'.repeat(40));
  res.set('Content-Type', 'text/plain').send(lines.join('\\n'));
});
`;
}
