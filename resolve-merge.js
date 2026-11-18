const fs = require('fs');
const base = 'ai4se-baseline/';
function resolve(file, pick) {
  const p = base + file;
  const s = fs.readFileSync(p, 'utf8');
  const re = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> origin\/main\r?\n/g;
  let i = 0;
  const out = s.replace(re, (_m, ours, theirs) => pick(i++, ours, theirs));
  if (/^(<<<<<<<|>>>>>>>|=======$)/m.test(out)) throw new Error('markers left in ' + file);
  fs.writeFileSync(p, out, 'utf8');
  console.log('resolved', file);
}
resolve('RouteME/backend/src/test/java/routeme/controller/OpenApiTest.java', (_i, ours) => ours.replaceAll('"0.27.0"', '"0.30.0"'));
resolve('RouteME/frontend/src/i18n/tripMessages.ts', (_i, ours, theirs) => ours + theirs);
resolve('RouteME/frontend/src/styles.css', (_i, ours, theirs) => ours + '}\n\n' + theirs);
resolve('RouteME/openapi.yaml', (i, ours, theirs) => i === 0 ? '  version: 0.30.0\n' : ours + theirs);
resolve('docs/sdd/README.md', (_i, ours) => ours);
resolve('requirement-workspace/handoff.md', (_i, ours) => ours);
