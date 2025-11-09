# Sample Code Question for Testing

## Question 1: Find Maximum Element in Array

### Question Details:
- **Title**: Find Maximum Element in Array
- **Description**: 
  Write a program that reads an integer `n` (the size of the array), followed by `n` integers (the array elements), and prints the maximum element in the array.

  **Example:**
  - If the input is `5` followed by `1 2 3 4 5`, the output should be `5`
  - If the input is `3` followed by `10 20 30`, the output should be `30`

- **Constraints**: 
  - 1 ≤ n ≤ 1000
  - -10^9 ≤ array elements ≤ 10^9

### Test Cases:

#### Sample Test Case 1 (Visible to Students):
- **Input**: 
  ```
  5
  1 2 3 4 5
  ```
- **Expected Output**: 
  ```
  5
  ```

#### Sample Test Case 2 (Visible to Students):
- **Input**: 
  ```
  3
  10 20 30
  ```
- **Expected Output**: 
  ```
  30
  ```

#### Hidden Test Case 1 (For Grading):
- **Input**: 
  ```
  1
  42
  ```
- **Expected Output**: 
  ```
  42
  ```

#### Hidden Test Case 2 (For Grading):
- **Input**: 
  ```
  4
  -5 -2 -10 -1
  ```
- **Expected Output**: 
  ```
  -1
  ```

#### Hidden Test Case 3 (For Grading):
- **Input**: 
  ```
  6
  100 50 75 200 25 150
  ```
- **Expected Output**: 
  ```
  200
  ```

---

## Question 2: Sum of Two Numbers

### Question Details:
- **Title**: Sum of Two Numbers
- **Description**: 
  Write a program that reads two integers `a` and `b` from standard input and prints their sum.

  **Example:**
  - If the input is `5 3`, the output should be `8`
  - If the input is `-10 20`, the output should be `10`

- **Constraints**: 
  - -10^9 ≤ a, b ≤ 10^9

### Test Cases:

#### Sample Test Case 1 (Visible to Students):
- **Input**: 
  ```
  5 3
  ```
- **Expected Output**: 
  ```
  8
  ```

#### Sample Test Case 2 (Visible to Students):
- **Input**: 
  ```
  -10 20
  ```
- **Expected Output**: 
  ```
  10
  ```

#### Hidden Test Case 1 (For Grading):
- **Input**: 
  ```
  0 0
  ```
- **Expected Output**: 
  ```
  0
  ```

#### Hidden Test Case 2 (For Grading):
- **Input**: 
  ```
  1000000 2000000
  ```
- **Expected Output**: 
  ```
  3000000
  ```

---

## Question 3: Check Even or Odd

### Question Details:
- **Title**: Check Even or Odd
- **Description**: 
  Write a program that reads an integer `n` and prints "even" if the number is even, or "odd" if the number is odd.

  **Example:**
  - If the input is `4`, the output should be `even`
  - If the input is `7`, the output should be `odd`

- **Constraints**: 
  - -10^9 ≤ n ≤ 10^9

### Test Cases:

#### Sample Test Case 1 (Visible to Students):
- **Input**: 
  ```
  4
  ```
- **Expected Output**: 
  ```
  even
  ```

#### Sample Test Case 2 (Visible to Students):
- **Input**: 
  ```
  7
  ```
- **Expected Output**: 
  ```
  odd
  ```

#### Hidden Test Case 1 (For Grading):
- **Input**: 
  ```
  0
  ```
- **Expected Output**: 
  ```
  even
  ```

#### Hidden Test Case 2 (For Grading):
- **Input**: 
  ```
  -5
  ```
- **Expected Output**: 
  ```
  odd
  ```

---

## Sample Solutions (For Reference)

### Python Solution for Question 1:
```python
n = int(input())
arr = list(map(int, input().split()))
print(max(arr))
```

### Python Solution for Question 2:
```python
a, b = map(int, input().split())
print(a + b)
```

### Python Solution for Question 3:
```python
n = int(input())
if n % 2 == 0:
    print("even")
else:
    print("odd")
```

---

## How to Create These Questions

1. **Navigate to Course Details** → **Manage Assignment** tab
2. **Select "Code-based" assignment type**
3. **In the Question Manager section**, fill in:
   - Title
   - Description
   - Constraints
   - Sample Input/Output (for sample test cases)
   - Test Input/Expected Output (for hidden test cases)
4. **Click "Save Question"**
5. **Select the question** using the checkbox
6. **Fill in assignment details** and click "Create Code Assignment"

## Testing Tips

- Start with Question 2 (Sum of Two Numbers) - it's the simplest
- Test with correct solutions first
- Try incorrect solutions to verify error handling
- Check that sample test cases are visible to students
- Verify hidden test cases are used for grading

