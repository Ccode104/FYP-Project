const { spawnSync } = require('child_process');

const source_code = `
def max_subarray(nums):
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best

import sys
import json
lines = sys.stdin.read().splitlines()
if not lines:
    sys.exit()
if len(lines) == 1 and lines[0].startswith('['):
    nums = json.loads(lines[0])
else:
    nums = [int(x) for x in lines if x.strip()]
print(max_subarray(nums))
`;

const result = spawnSync('python', ['-c', source_code], {
    input: '-2\n1\n-3\n4\n-1\n2\n1\n-5\n4',
    encoding: 'utf-8'
});

console.log('STDOUT:', result.stdout);
console.log('STDERR:', result.stderr);
console.log('STATUS:', result.status);
