-- Update CSE304 Data Structures Implementation assignment with proper code questions
-- This script creates code questions with template code, driver code, and constraints

-- First, create code questions for data structures
INSERT INTO code_questions (
    title,
    description,
    constraints,
    template_code,
    driver_code,
    created_by,
    created_at,
    difficulty,
    time_limit_seconds,
    max_points
) VALUES
(
    'Stack Implementation',
    'Implement a Stack data structure with push, pop, peek, and is_empty operations. The stack should follow LIFO (Last In, First Out) principle.',
    'Time Complexity: push O(1), pop O(1), peek O(1), is_empty O(1). Space Complexity: O(n). Use Python list or implement with linked list. Handle edge cases properly.',
    '{
        "python": "class Stack:\n    def __init__(self):\n        # Initialize your stack here\n        pass\n    \n    def push(self, item):\n        # Add item to top of stack\n        pass\n    \n    def pop(self):\n        # Remove and return item from top of stack\n        # Return None if stack is empty\n        pass\n    \n    def peek(self):\n        # Return item from top of stack without removing it\n        # Return None if stack is empty\n        pass\n    \n    def is_empty(self):\n        # Return True if stack is empty, False otherwise\n        pass\n    \n    def size(self):\n        # Return number of items in stack\n        pass",
        "java": "public class Stack {\n    // Initialize your stack here\n    public Stack() {\n        \n    }\n    \n    public void push(int item) {\n        // Add item to top of stack\n    }\n    \n    public Integer pop() {\n        // Remove and return item from top of stack\n        // Return null if stack is empty\n        return null;\n    }\n    \n    public Integer peek() {\n        // Return item from top of stack without removing it\n        // Return null if stack is empty\n        return null;\n    }\n    \n    public boolean isEmpty() {\n        // Return true if stack is empty, false otherwise\n        return true;\n    }\n    \n    public int size() {\n        // Return number of items in stack\n        return 0;\n    }\n}",
        "cpp": "class Stack {\nprivate:\n    // Add your data members here\n    \npublic:\n    Stack() {\n        // Initialize your stack here\n    }\n    \n    void push(int item) {\n        // Add item to top of stack\n    }\n    \n    int pop() {\n        // Remove and return item from top of stack\n        // Return -1 if stack is empty\n        return -1;\n    }\n    \n    int peek() {\n        // Return item from top of stack without removing it\n        // Return -1 if stack is empty\n        return -1;\n    }\n    \n    bool isEmpty() {\n        // Return true if stack is empty, false otherwise\n        return true;\n    }\n    \n    int size() {\n        // Return number of items in stack\n        return 0;\n    }\n};"
    }',
    '{
        "python": "# Test code for Stack implementation\nif __name__ == \"__main__\":\n    stack = Stack()\n    \n    # Test push and size\n    stack.push(1)\n    stack.push(2)\n    stack.push(3)\n    print(f\"Size after pushing 3 items: {stack.size()}\")  # Should be 3\n    print(f\"Is empty: {stack.is_empty()}\")  # Should be False\n    \n    # Test peek\n    print(f\"Top element: {stack.peek()}\")  # Should be 3\n    \n    # Test pop\n    print(f\"Popped: {stack.pop()}\")  # Should be 3\n    print(f\"Size after pop: {stack.size()}\")  # Should be 2\n    print(f\"Top element after pop: {stack.peek()}\")  # Should be 2\n    \n    # Test empty stack\n    stack.pop()\n    stack.pop()\n    print(f\"Is empty after popping all: {stack.is_empty()}\")  # Should be True\n    print(f\"Pop from empty stack: {stack.pop()}\")  # Should be None\n    print(f\"Peek from empty stack: {stack.peek()}\")  # Should be None",
        "java": "// Test code for Stack implementation\npublic class Main {\n    public static void main(String[] args) {\n        Stack stack = new Stack();\n        \n        // Test push and size\n        stack.push(1);\n        stack.push(2);\n        stack.push(3);\n        System.out.println(\"Size after pushing 3 items: \" + stack.size()); // Should be 3\n        System.out.println(\"Is empty: \" + stack.isEmpty()); // Should be false\n        \n        // Test peek\n        System.out.println(\"Top element: \" + stack.peek()); // Should be 3\n        \n        // Test pop\n        System.out.println(\"Popped: \" + stack.pop()); // Should be 3\n        System.out.println(\"Size after pop: \" + stack.size()); // Should be 2\n        System.out.println(\"Top element after pop: \" + stack.peek()); // Should be 2\n        \n        // Test empty stack\n        stack.pop();\n        stack.pop();\n        System.out.println(\"Is empty after popping all: \" + stack.isEmpty()); // Should be true\n        System.out.println(\"Pop from empty stack: \" + stack.pop()); // Should be null\n        System.out.println(\"Peek from empty stack: \" + stack.peek()); // Should be null\n    }\n}",
        "cpp": "// Test code for Stack implementation\n#include <iostream>\n\nint main() {\n    Stack stack;\n    \n    // Test push and size\n    stack.push(1);\n    stack.push(2);\n    stack.push(3);\n    std::cout << \"Size after pushing 3 items: \" << stack.size() << std::endl; // Should be 3\n    std::cout << \"Is empty: \" << (stack.isEmpty() ? \"true\" : \"false\") << std::endl; // Should be false\n    \n    // Test peek\n    std::cout << \"Top element: \" << stack.peek() << std::endl; // Should be 3\n    \n    // Test pop\n    std::cout << \"Popped: \" << stack.pop() << std::endl; // Should be 3\n    std::cout << \"Size after pop: \" << stack.size() << std::endl; // Should be 2\n    std::cout << \"Top element after pop: \" << stack.peek() << std::endl; // Should be 2\n    \n    // Test empty stack\n    stack.pop();\n    stack.pop();\n    std::cout << \"Is empty after popping all: \" << (stack.isEmpty() ? \"true\" : \"false\") << std::endl; // Should be true\n    std::cout << \"Pop from empty stack: \" << stack.pop() << std::endl; // Should be -1\n    std::cout << \"Peek from empty stack: \" << stack.peek() << std::endl; // Should be -1\n    \n    return 0;\n}"
    }',
    33,
    NOW(),
    'medium',
    1800,
    35
),
(
    'Queue Implementation',
    'Implement a Queue data structure with enqueue, dequeue, front, and is_empty operations. The queue should follow FIFO (First In, First Out) principle.',
    'Time Complexity: enqueue O(1), dequeue O(1), front O(1), is_empty O(1). Space Complexity: O(n). Use Python list or implement with linked list. Handle edge cases properly.',
    '{
        "python": "class Queue:\n    def __init__(self):\n        # Initialize your queue here\n        pass\n    \n    def enqueue(self, item):\n        # Add item to rear of queue\n        pass\n    \n    def dequeue(self):\n        # Remove and return item from front of queue\n        # Return None if queue is empty\n        pass\n    \n    def front(self):\n        # Return item from front of queue without removing it\n        # Return None if queue is empty\n        pass\n    \n    def is_empty(self):\n        # Return True if queue is empty, False otherwise\n        pass\n    \n    def size(self):\n        # Return number of items in queue\n        pass",
        "java": "public class Queue {\n    // Initialize your queue here\n    public Queue() {\n        \n    }\n    \n    public void enqueue(int item) {\n        // Add item to rear of queue\n    }\n    \n    public Integer dequeue() {\n        // Remove and return item from front of queue\n        // Return null if queue is empty\n        return null;\n    }\n    \n    public Integer front() {\n        // Return item from front of queue without removing it\n        // Return null if queue is empty\n        return null;\n    }\n    \n    public boolean isEmpty() {\n        // Return true if queue is empty, false otherwise\n        return true;\n    }\n    \n    public int size() {\n        // Return number of items in queue\n        return 0;\n    }\n}",
        "cpp": "class Queue {\nprivate:\n    // Add your data members here\n    \npublic:\n    Queue() {\n        // Initialize your queue here\n    }\n    \n    void enqueue(int item) {\n        // Add item to rear of queue\n    }\n    \n    int dequeue() {\n        // Remove and return item from front of queue\n        // Return -1 if queue is empty\n        return -1;\n    }\n    \n    int front() {\n        // Return item from front of queue without removing it\n        // Return -1 if queue is empty\n        return -1;\n    }\n    \n    bool isEmpty() {\n        // Return true if queue is empty, false otherwise\n        return true;\n    }\n    \n    int size() {\n        // Return number of items in queue\n        return 0;\n    }\n};"
    }',
    '{
        "python": "# Test code for Queue implementation\nif __name__ == \"__main__\":\n    queue = Queue()\n    \n    # Test enqueue and size\n    queue.enqueue(1)\n    queue.enqueue(2)\n    queue.enqueue(3)\n    print(f\"Size after enqueueing 3 items: {queue.size()}\")  # Should be 3\n    print(f\"Is empty: {queue.is_empty()}\")  # Should be False\n    \n    # Test front\n    print(f\"Front element: {queue.front()}\")  # Should be 1\n    \n    # Test dequeue\n    print(f\"Dequeued: {queue.dequeue()}\")  # Should be 1\n    print(f\"Size after dequeue: {queue.size()}\")  # Should be 2\n    print(f\"Front element after dequeue: {queue.front()}\")  # Should be 2\n    \n    # Test empty queue\n    queue.dequeue()\n    queue.dequeue()\n    print(f\"Is empty after dequeueing all: {queue.is_empty()}\")  # Should be True\n    print(f\"Dequeue from empty queue: {queue.dequeue()}\")  # Should be None\n    print(f\"Front from empty queue: {queue.front()}\")  # Should be None",
        "java": "// Test code for Queue implementation\npublic class Main {\n    public static void main(String[] args) {\n        Queue queue = new Queue();\n        \n        // Test enqueue and size\n        queue.enqueue(1);\n        queue.enqueue(2);\n        queue.enqueue(3);\n        System.out.println(\"Size after enqueueing 3 items: \" + queue.size()); // Should be 3\n        System.out.println(\"Is empty: \" + queue.isEmpty()); // Should be false\n        \n        // Test front\n        System.out.println(\"Front element: \" + queue.front()); // Should be 1\n        \n        // Test dequeue\n        System.out.println(\"Dequeued: \" + queue.dequeue()); // Should be 1\n        System.out.println(\"Size after dequeue: \" + queue.size()); // Should be 2\n        System.out.println(\"Front element after dequeue: \" + queue.front()); // Should be 2\n        \n        // Test empty queue\n        queue.dequeue();\n        queue.dequeue();\n        System.out.println(\"Is empty after dequeueing all: \" + queue.isEmpty()); // Should be true\n        System.out.println(\"Dequeue from empty queue: \" + queue.dequeue()); // Should be null\n        System.out.println(\"Front from empty queue: \" + queue.front()); // Should be null\n    }\n}",
        "cpp": "// Test code for Queue implementation\n#include <iostream>\n\nint main() {\n    Queue queue;\n    \n    // Test enqueue and size\n    queue.enqueue(1);\n    queue.enqueue(2);\n    queue.enqueue(3);\n    std::cout << \"Size after enqueueing 3 items: \" << queue.size() << std::endl; // Should be 3\n    std::cout << \"Is empty: \" << (queue.isEmpty() ? \"true\" : \"false\") << std::endl; // Should be false\n    \n    // Test front\n    std::cout << \"Front element: \" << queue.front() << std::endl; // Should be 1\n    \n    // Test dequeue\n    std::cout << \"Dequeued: \" << queue.dequeue() << std::endl; // Should be 1\n    std::cout << \"Size after dequeue: \" << queue.size() << std::endl; // Should be 2\n    std::cout << \"Front element after dequeue: \" << queue.front() << std::endl; // Should be 2\n    \n    // Test empty queue\n    queue.dequeue();\n    queue.dequeue();\n    std::cout << \"Is empty after dequeueing all: \" << (queue.isEmpty() ? \"true\" : \"false\") << std::endl; // Should be true\n    std::cout << \"Dequeue from empty queue: \" << queue.dequeue() << std::endl; // Should be -1\n    std::cout << \"Front from empty queue: \" << queue.front() << std::endl; // Should be -1\n    \n    return 0;\n}"
    }',
    33,
    NOW(),
    'medium',
    1800,
    35
),
(
    'Linked List Implementation',
    'Implement a singly Linked List data structure with insert, delete, search, and traversal operations. Include proper Node class implementation.',
    'Time Complexity: insert O(1) at head, O(n) at position, delete O(1) at head, O(n) at position, search O(n). Space Complexity: O(n). Handle edge cases like empty list, single node, etc.',
    '{
        "python": "class Node:\n    def __init__(self, data):\n        self.data = data\n        self.next = None\n\nclass LinkedList:\n    def __init__(self):\n        # Initialize your linked list here\n        self.head = None\n        self.size = 0\n    \n    def insert_at_head(self, data):\n        # Insert node at the beginning\n        pass\n    \n    def insert_at_end(self, data):\n        # Insert node at the end\n        pass\n    \n    def delete_head(self):\n        # Delete node from beginning\n        # Return deleted data or None if empty\n        pass\n    \n    def delete_value(self, value):\n        # Delete first occurrence of value\n        # Return True if found and deleted, False otherwise\n        pass\n    \n    def search(self, value):\n        # Return True if value exists, False otherwise\n        pass\n    \n    def get_size(self):\n        # Return number of nodes in list\n        return self.size\n    \n    def is_empty(self):\n        # Return True if list is empty, False otherwise\n        pass\n    \n    def print_list(self):\n        # Print all elements in the list\n        pass",
        "java": "class Node {\n    int data;\n    Node next;\n    \n    Node(int data) {\n        this.data = data;\n        this.next = null;\n    }\n}\n\npublic class LinkedList {\n    private Node head;\n    private int size;\n    \n    public LinkedList() {\n        // Initialize your linked list here\n        this.head = null;\n        this.size = 0;\n    }\n    \n    public void insertAtHead(int data) {\n        // Insert node at the beginning\n    }\n    \n    public void insertAtEnd(int data) {\n        // Insert node at the end\n    }\n    \n    public Integer deleteHead() {\n        // Delete node from beginning\n        // Return deleted data or null if empty\n        return null;\n    }\n    \n    public boolean deleteValue(int value) {\n        // Delete first occurrence of value\n        // Return true if found and deleted, false otherwise\n        return false;\n    }\n    \n    public boolean search(int value) {\n        // Return true if value exists, false otherwise\n        return false;\n    }\n    \n    public int getSize() {\n        // Return number of nodes in list\n        return this.size;\n    }\n    \n    public boolean isEmpty() {\n        // Return true if list is empty, false otherwise\n        return true;\n    }\n    \n    public void printList() {\n        // Print all elements in the list\n    }\n}",
        "cpp": "struct Node {\n    int data;\n    Node* next;\n    \n    Node(int data) {\n        this->data = data;\n        this->next = nullptr;\n    }\n};\n\nclass LinkedList {\nprivate:\n    Node* head;\n    int size;\n    \npublic:\n    LinkedList() {\n        // Initialize your linked list here\n        this->head = nullptr;\n        this->size = 0;\n    }\n    \n    void insertAtHead(int data) {\n        // Insert node at the beginning\n    }\n    \n    void insertAtEnd(int data) {\n        // Insert node at the end\n    }\n    \n    int deleteHead() {\n        // Delete node from beginning\n        // Return deleted data or -1 if empty\n        return -1;\n    }\n    \n    bool deleteValue(int value) {\n        // Delete first occurrence of value\n        // Return true if found and deleted, false otherwise\n        return false;\n    }\n    \n    bool search(int value) {\n        // Return true if value exists, false otherwise\n        return false;\n    }\n    \n    int getSize() {\n        // Return number of nodes in list\n        return this->size;\n    }\n    \n    bool isEmpty() {\n        // Return true if list is empty, false otherwise\n        return true;\n    }\n    \n    void printList() {\n        // Print all elements in the list\n    }\n};"
    }',
    '{
        "python": "# Test code for Linked List implementation\nif __name__ == \"__main__\":\n    ll = LinkedList()\n    \n    # Test empty list\n    print(f\"Is empty: {ll.is_empty()}\")  # Should be True\n    print(f\"Size: {ll.get_size()}\")  # Should be 0\n    \n    # Test insert at head\n    ll.insert_at_head(1)\n    ll.insert_at_head(2)\n    ll.insert_at_head(3)\n    print(f\"Size after inserting 3 items: {ll.get_size()}\")  # Should be 3\n    print(f\"Is empty: {ll.is_empty()}\")  # Should be False\n    print(\"List after insert at head:\", end=\" \")\n    ll.print_list()  # Should print: 3 -> 2 -> 1\n    \n    # Test search\n    print(f\"Search for 2: {ll.search(2)}\")  # Should be True\n    print(f\"Search for 4: {ll.search(4)}\")  # Should be False\n    \n    # Test insert at end\n    ll.insert_at_end(4)\n    print(f\"Size after insert at end: {ll.get_size()}\")  # Should be 4\n    print(\"List after insert at end:\", end=\" \")\n    ll.print_list()  # Should print: 3 -> 2 -> 1 -> 4\n    \n    # Test delete head\n    deleted = ll.delete_head()\n    print(f\"Deleted head: {deleted}\")  # Should be 3\n    print(f\"Size after delete head: {ll.get_size()}\")  # Should be 3\n    print(\"List after delete head:\", end=\" \")\n    ll.print_list()  # Should print: 2 -> 1 -> 4\n    \n    # Test delete value\n    deleted = ll.delete_value(1)\n    print(f\"Deleted value 1: {deleted}\")  # Should be True\n    print(f\"Size after delete value: {ll.get_size()}\")  # Should be 2\n    print(\"List after delete value:\", end=\" \")\n    ll.print_list()  # Should print: 2 -> 4",
        "java": "// Test code for Linked List implementation\npublic class Main {\n    public static void main(String[] args) {\n        LinkedList ll = new LinkedList();\n        \n        // Test empty list\n        System.out.println(\"Is empty: \" + ll.isEmpty()); // Should be true\n        System.out.println(\"Size: \" + ll.getSize()); // Should be 0\n        \n        // Test insert at head\n        ll.insertAtHead(1);\n        ll.insertAtHead(2);\n        ll.insertAtHead(3);\n        System.out.println(\"Size after inserting 3 items: \" + ll.getSize()); // Should be 3\n        System.out.println(\"Is empty: \" + ll.isEmpty()); // Should be false\n        System.out.print(\"List after insert at head: \");\n        ll.printList(); // Should print: 3 -> 2 -> 1\n        \n        // Test search\n        System.out.println(\"Search for 2: \" + ll.search(2)); // Should be true\n        System.out.println(\"Search for 4: \" + ll.search(4)); // Should be false\n        \n        // Test insert at end\n        ll.insertAtEnd(4);\n        System.out.println(\"Size after insert at end: \" + ll.getSize()); // Should be 4\n        System.out.print(\"List after insert at end: \");\n        ll.printList(); // Should print: 3 -> 2 -> 1 -> 4\n        \n        // Test delete head\n        Integer deleted = ll.deleteHead();\n        System.out.println(\"Deleted head: \" + deleted); // Should be 3\n        System.out.println(\"Size after delete head: \" + ll.getSize()); // Should be 3\n        System.out.print(\"List after delete head: \");\n        ll.printList(); // Should print: 2 -> 1 -> 4\n        \n        // Test delete value\n        boolean deletedVal = ll.deleteValue(1);\n        System.out.println(\"Deleted value 1: \" + deletedVal); // Should be true\n        System.out.println(\"Size after delete value: \" + ll.getSize()); // Should be 2\n        System.out.print(\"List after delete value: \");\n        ll.printList(); // Should print: 2 -> 4\n    }\n}",
        "cpp": "// Test code for Linked List implementation\n#include <iostream>\n\nint main() {\n    LinkedList ll;\n    \n    // Test empty list\n    std::cout << \"Is empty: \" << (ll.isEmpty() ? \"true\" : \"false\") << std::endl; // Should be true\n    std::cout << \"Size: \" << ll.getSize() << std::endl; // Should be 0\n    \n    // Test insert at head\n    ll.insertAtHead(1);\n    ll.insertAtHead(2);\n    ll.insertAtHead(3);\n    std::cout << \"Size after inserting 3 items: \" << ll.getSize() << std::endl; // Should be 3\n    std::cout << \"Is empty: \" << (ll.isEmpty() ? \"true\" : \"false\") << std::endl; // Should be false\n    std::cout << \"List after insert at head: \";\n    ll.printList(); // Should print: 3 -> 2 -> 1\n    \n    // Test search\n    std::cout << \"Search for 2: \" << (ll.search(2) ? \"true\" : \"false\") << std::endl; // Should be true\n    std::cout << \"Search for 4: \" << (ll.search(4) ? \"true\" : \"false\") << std::endl; // Should be false\n    \n    // Test insert at end\n    ll.insertAtEnd(4);\n    std::cout << \"Size after insert at end: \" << ll.getSize() << std::endl; // Should be 4\n    std::cout << \"List after insert at end: \";\n    ll.printList(); // Should print: 3 -> 2 -> 1 -> 4\n    \n    // Test delete head\n    int deleted = ll.deleteHead();\n    std::cout << \"Deleted head: \" << deleted << std::endl; // Should be 3\n    std::cout << \"Size after delete head: \" << ll.getSize() << std::endl; // Should be 3\n    std::cout << \"List after delete head: \";\n    ll.printList(); // Should print: 2 -> 1 -> 4\n    \n    // Test delete value\n    bool deletedVal = ll.deleteValue(1);\n    std::cout << \"Deleted value 1: \" << (deletedVal ? \"true\" : \"false\") << std::endl; // Should be true\n    std::cout << \"Size after delete value: \" << ll.getSize() << std::endl; // Should be 2\n    std::cout << \"List after delete value: \";\n    ll.printList(); // Should print: 2 -> 4\n    \n    return 0;\n}"
    }',
    33,
    NOW(),
    'hard',
    2400,
    30
);

-- Add test cases for the code questions
INSERT INTO code_question_testcases (question_id, is_sample, input_text, expected_text) VALUES
-- Stack test cases
((SELECT id FROM code_questions WHERE title = 'Stack Implementation' LIMIT 1), true, '', 'Size after pushing 3 items: 3\nIs empty: False\nTop element: 3\nPopped: 3\nSize after pop: 2\nTop element after pop: 2\nIs empty after popping all: True\nPop from empty stack: None\nPeek from empty stack: None'),
((SELECT id FROM code_questions WHERE title = 'Stack Implementation' LIMIT 1), false, '', 'Size after pushing 3 items: 3\nIs empty: False\nTop element: 3\nPopped: 3\nSize after pop: 2\nTop element after pop: 2\nIs empty after popping all: True\nPop from empty stack: None\nPeek from empty stack: None'),
-- Queue test cases
((SELECT id FROM code_questions WHERE title = 'Queue Implementation' LIMIT 1), true, '', 'Size after enqueueing 3 items: 3\nIs empty: False\nFront element: 1\nDequeued: 1\nSize after dequeue: 2\nFront element after dequeue: 2\nIs empty after dequeueing all: True\nDequeue from empty queue: None\nFront from empty queue: None'),
((SELECT id FROM code_questions WHERE title = 'Queue Implementation' LIMIT 1), false, '', 'Size after enqueueing 3 items: 3\nIs empty: False\nFront element: 1\nDequeued: 1\nSize after dequeue: 2\nFront element after dequeue: 2\nIs empty after dequeueing all: True\nDequeue from empty queue: None\nFront from empty queue: None'),
-- Linked List test cases
((SELECT id FROM code_questions WHERE title = 'Linked List Implementation' LIMIT 1), true, '', 'Is empty: True\nSize: 0\nSize after inserting 3 items: 3\nIs empty: False\nList after insert at head: 3 -> 2 -> 1\nSearch for 2: True\nSearch for 4: False\nSize after insert at end: 4\nList after insert at end: 3 -> 2 -> 1 -> 4\nDeleted head: 3\nSize after delete head: 3\nList after delete head: 2 -> 1 -> 4\nDeleted value 1: True\nSize after delete value: 2\nList after delete value: 2 -> 4'),
((SELECT id FROM code_questions WHERE title = 'Linked List Implementation' LIMIT 1), false, '', 'Is empty: True\nSize: 0\nSize after inserting 3 items: 3\nIs empty: False\nList after insert at head: 3 -> 2 -> 1\nSearch for 2: True\nSearch for 4: False\nSize after insert at end: 4\nList after insert at end: 3 -> 2 -> 1 -> 4\nDeleted head: 3\nSize after delete head: 3\nList after delete head: 2 -> 1 -> 4\nDeleted value 1: True\nSize after delete value: 2\nList after delete value: 2 -> 4');

-- Now update the assignment to use these code questions instead of the simple config
-- First, delete the existing assignment and recreate it with proper code questions
DELETE FROM assignments WHERE title = 'Data Structures Implementation';

-- Recreate the assignment with code questions
INSERT INTO assignments (
    course_offering_id, title, description, assignment_type,
    assignment_config, submission_requirements, grading_config,
    total_points, allow_multiple_submissions, is_graded, created_by, created_at
) VALUES (
    (SELECT co.id FROM course_offerings co JOIN courses c ON co.course_id = c.id WHERE c.code = 'CSE304' LIMIT 1),
    'Data Structures Implementation',
    'Implement basic data structures (Stack, Queue, Linked List) with comprehensive test cases and proper constraints',
    'code',

    -- Assignment Configuration (now using code questions)
    '{
        "assignment_type": "code_questions",
        "questions": [
            {
                "question_id": "stack_impl",
                "title": "Stack Implementation",
                "description": "Implement a Stack data structure with all required operations",
                "points": 35,
                "time_limit": 1800
            },
            {
                "question_id": "queue_impl",
                "title": "Queue Implementation",
                "description": "Implement a Queue data structure with all required operations",
                "points": 35,
                "time_limit": 1800
            },
            {
                "question_id": "linked_list_impl",
                "title": "Linked List Implementation",
                "description": "Implement a singly Linked List with comprehensive operations",
                "points": 30,
                "time_limit": 2400
            }
        ],
        "settings": {
            "allow_group_work": false,
            "peer_review_required": false,
            "auto_grading_enabled": true,
            "plagiarism_check": true,
            "code_execution_required": true,
            "supported_languages": ["python", "java", "cpp"],
            "template_code_required": true,
            "driver_code_required": true
        },
        "constraints": {
            "time_limit_total": 6000,
            "memory_limit_mb": 256,
            "max_code_length": 1000,
            "required_complexity": "O(1) for basic operations, O(n) for search/delete",
            "edge_cases_required": true
        }
    }',

    -- Submission Requirements
    '[{
        "component_id": "code_questions",
        "submission_type": "code_questions",
        "accepted_formats": [".py", ".java", ".cpp"],
        "max_file_size_mb": 5,
        "required": true,
        "description": "Complete implementations of Stack, Queue, and Linked List with test cases"
    }]',

    -- Grading Configuration
    '{
        "grading_type": "code_execution",
        "use_rubric": true,
        "rubric_id": "data_structures_rubric",
        "allow_partial_credit": true,
        "grade_visibility": "after_due_date",
        "auto_grading_weight": 0.8,
        "manual_review_weight": 0.2,
        "test_case_coverage_required": true
    }',

    100, true, true, 33, NOW() - INTERVAL '7 days'
);

-- Link the code questions to the assignment
INSERT INTO assignment_questions (assignment_id, question_id, points, position) VALUES
((SELECT id FROM assignments WHERE title = 'Data Structures Implementation' LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Stack Implementation' LIMIT 1), 35, 1),
((SELECT id FROM assignments WHERE title = 'Data Structures Implementation' LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Queue Implementation' LIMIT 1), 35, 2),
((SELECT id FROM assignments WHERE title = 'Data Structures Implementation' LIMIT 1), (SELECT id FROM code_questions WHERE title = 'Linked List Implementation' LIMIT 1), 30, 3);

COMMIT;