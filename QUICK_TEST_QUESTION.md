# Quick Test Question for Code Submission Assignment

## Question: Sum of Two Numbers

This is a simple question perfect for testing the entire code submission workflow.

---

## Step 1: Create the Question

Go to **Course Details** → **Manage Assignment** tab → Select **"Code-based"** → **Question Manager** section

### Fill in the form:

**Title:**
```
Sum of Two Numbers
```

**Description:**
```
Write a program that reads two integers a and b from standard input and prints their sum.

Example:
- If the input is '5 3', the output should be '8'
- If the input is '-10 20', the output should be '10'
```

**Constraints:**
```
-10^9 ≤ a, b ≤ 10^9
```

**Sample Input:**
```
5 3
```

**Sample Output:**
```
8
```

**Test Input (hidden):**
```
100 200
```

**Expected Output (hidden):**
```
300
```

### Click "Save Question"

---

## Step 2: Create the Assignment

1. **Select the question** you just created (check the checkbox)
2. Fill in assignment details:
   - **Title:** `Test Assignment - Sum of Two Numbers`
   - **Description:** (optional)
   - **Release at:** (optional, leave empty for immediate release)
   - **Due at:** (optional, or set a future date)
   - **Max score:** `100`
   - **Allow multiple submissions:** (check if you want to allow resubmissions)
3. Click **"Create Code Assignment (with selected questions)"**

---

## Step 3: Test as a Student

1. Switch to student role or use a student account
2. Go to the course → **Assignments (Present)** tab
3. Find your assignment and click **"Attempt"** button
4. You should see:
   - Question description
   - Sample test case (Input: `5 3`, Expected Output: `8`)
   - Code editor

---

## Step 4: Test Code Execution

### Test with Python (Correct Solution):

```python
a, b = map(int, input().split())
print(a + b)
```

**Expected Result:**
- Click "Run Code" → Should show: Test passed! Output: `8`
- Click "Submit" → Should show success message

### Test with Python (Incorrect Solution - to verify error handling):

```python
a, b = map(int, input().split())
print(a - b)  # Wrong: subtracts instead of adds
```

**Expected Result:**
- Click "Run Code" → May pass sample test if it matches by chance
- Click "Submit" → Should fail hidden test case (expects 300, gets -100)

### Test with Java (Correct Solution):

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}
```

### Test with C++ (Correct Solution):

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
```

---

## Additional Test Cases (Optional)

If you want to add more test cases, you can create additional questions:

### Question 2: Check Even or Odd

**Title:** `Check Even or Odd`

**Description:**
```
Write a program that reads an integer n and prints "even" if the number is even, or "odd" if the number is odd.
```

**Constraints:**
```
-10^9 ≤ n ≤ 10^9
```

**Sample Input:**
```
4
```

**Sample Output:**
```
even
```

**Test Input (hidden):**
```
7
```

**Expected Output (hidden):**
```
odd
```

**Python Solution:**
```python
n = int(input())
if n % 2 == 0:
    print("even")
else:
    print("odd")
```

---

## Verification Checklist

After creating and testing:

- [ ] Question created successfully
- [ ] Question appears in "Available Questions" list
- [ ] Assignment created with the question
- [ ] Assignment appears in student's assignment list
- [ ] Student can see question and sample test cases
- [ ] "Run Code" button executes code correctly
- [ ] Sample test case shows correct output
- [ ] "Submit" button stores submission in database
- [ ] Test results are saved correctly
- [ ] Judge0 API is being called (check backend logs)

---

## Troubleshooting

### If "Run Code" doesn't work:
- Check backend console for errors
- Verify Judge0 API credentials in `.env` file
- Check network tab in browser DevTools for API calls

### If "Submit" doesn't work:
- Check backend console for database errors
- Verify the assignment was created correctly
- Check if user has proper permissions

### If test cases don't match:
- Ensure input/output text matches exactly (including whitespace)
- Check for trailing newlines in expected output
- Verify test case is marked as "sample" or "hidden" correctly

---

## Expected Database Records

After successful submission, you should see:
- `assignment_submissions` entry
- `code_submissions` entry
- `code_submission_results` entries (one per test case)

---

Good luck testing! 🚀

