const http = require('http');

const data = JSON.stringify({
  source_code: `def max_subarray(nums):
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best`,
  language: 'python',
  stdin: "-2\n1\n-3\n4\n-1\n2\n1\n-5\n4",
  expected_output: "6",
  question_id: 803
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/judge/execute',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Response:', chunks));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
