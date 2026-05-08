import sys

def factorial(n):
    if n == 0 or n == 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

if __name__ == "__main__":
    # Read from stdin and print to stdout
    for line in sys.stdin:
        if line.strip():
            try:
                n = int(line.strip())
                print(factorial(n))
            except ValueError:
                pass
