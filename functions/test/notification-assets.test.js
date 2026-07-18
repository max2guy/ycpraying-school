const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('service worker directly displays background notification', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
  assert.match(source, /messaging\.onBackgroundMessage/);
  assert.match(source, /self\.registration\.showNotification/);
  assert.match(source, /icon:\s*'notification-icon\.svg'/);
  assert.match(source, /badge:\s*'notification-badge\.png'/);
});

test('notification badge is the verified 96px RGBA cross', () => {
  const badge = fs.readFileSync(path.join(__dirname, '..', '..', 'notification-badge.png'));

  assert.deepEqual(badge.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(badge.toString('ascii', 12, 16), 'IHDR');
  assert.equal(badge.readUInt32BE(16), 96);
  assert.equal(badge.readUInt32BE(20), 96);
  assert.equal(badge[24], 8);
  assert.equal(badge[25], 6);
  assert.equal(
    crypto.createHash('sha256').update(badge).digest('hex'),
    '15f16b6e2e633128270c8a0a601c344f79dccbb522571c2b8c27cf1c7e709c96'
  );
});
