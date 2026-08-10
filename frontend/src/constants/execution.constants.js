export const EXECUTION_LANGUAGES = [
  { 
    id: 'javascript', 
    name: 'Node.js', 
    version: 'v20.11.0', 
    snippet: 'console.log("CodeTrail Execution Active!");\nconst sum = (a, b) => a + b;\nconsole.log(`Calculated Sum: ${sum(10, 32)}`);',
    expectedOutput: [
      'CodeTrail Execution Active!',
      'Calculated Sum: 42',
      '\n[Process exited with status code 0 in 14ms]'
    ]
  },
  { 
    id: 'python', 
    name: 'Python 3', 
    version: 'v3.10.12', 
    snippet: 'print("CodeTrail Python Runner Initialized")\ndef fibonacci(n):\n    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)\nprint("Fib(10) =", fibonacci(10))',
    expectedOutput: [
      'CodeTrail Python Runner Initialized',
      'Fib(10) = 55',
      '\n[Process exited with status code 0 in 18ms]'
    ]
  },
  { 
    id: 'cpp', 
    name: 'C++ 20', 
    version: 'GCC 13.2', 
    snippet: '#include <iostream>\nint main() {\n    std::cout << "CodeTrail C++20 Sandbox Ready\\n";\n    return 0;\n}',
    expectedOutput: [
      'CodeTrail C++20 Sandbox Ready',
      '\n[Process exited with status code 0 in 22ms]'
    ]
  },
  { 
    id: 'java', 
    name: 'Java', 
    version: 'OpenJDK 21', 
    snippet: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("CodeTrail Java Sandbox Engine");\n    }\n}',
    expectedOutput: [
      'CodeTrail Java Sandbox Engine',
      '\n[Process exited with status code 0 in 35ms]'
    ]
  }
];
