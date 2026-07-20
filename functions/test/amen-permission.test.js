const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('allows only the signed-in user to toggle their own amen', () => {
  const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'database.rules.json'), 'utf8'));
  const rule = rules.rules.members.$memberId.prayers.$prayerIndex.amens.$amenUid['.write'];
  assert.match(rule, /auth\.uid === \$amenUid/);
  assert.match(rule, /newData\.val\(\) === true/);
  assert.match(rule, /!newData\.exists\(\)/);
});

test('waits for Firebase before showing the amen celebration', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'script.js'), 'utf8');
  const toggleAmen = source.match(/function toggleAmen\(i, e\) \{([\s\S]*?)\n\}/)[1];
  assert.match(toggleAmen, /e\.stopPropagation\(\)/);
  assert.match(toggleAmen, /amenRef\.transaction/);
  assert.ok(toggleAmen.indexOf('amenRef.transaction') < toggleAmen.indexOf('createFirework'));
});
