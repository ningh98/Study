export interface Question {
  question: string;
  options: string[];
  correct: number;
}

export interface RoadmapItem {
  id: string;
  title: string;
  summary: string;
  level: number;
  study_material: string[];
  status: "todo" | "in_progress" | "done";
  progress?: number;
  questions: Question[];
}

export const roadmapItems: RoadmapItem[] = [
  {
    id: "1",
    title: "Arrays & Big-O",
    summary: "Intro + 10 practice Qs",
    level: 1,
    study_material: ["youtube.com/arrays", "google.com/search?q=big-o"],
    status: "done" as const,
    questions: [
      {
        question: "What is the time complexity of accessing an element by index in an array?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
        correct: 0
      },
      {
        question: "Which Big-O represents linear time complexity?",
        options: ["O(1)", "O(n)", "O(n^2)", "O(log n)"],
        correct: 1
      },
      {
        question: "What does Big-O measure?",
        options: ["Best case", "Average case", "Worst case (asymptotic upper bound)", "Exact runtime"],
        correct: 2
      },
      {
        question: "Which sorting algorithm has O(n log n) time complexity?",
        options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"],
        correct: 2
      }
    ],
  },
  {
    id: "2",
    title: "Two Pointers",
    summary: "Patterns + drills",
    level: 2,
    study_material: ["youtube.com/two-pointers", "google.com/search?q=two+pointer+technique"],
    status: "in_progress" as const,
    progress: 40,
    questions: [
      {
        question: "What is the two-pointer technique typically used for?",
        options: ["Sorting arrays", "Finding pairs in sorted arrays", "Tree traversals", "Dynamic programming"],
        correct: 1
      },
      {
        question: "In the two pointers technique, what is usually the time complexity?",
        options: ["O(1)", "O(n)", "O(n^2)", "O(log n)"],
        correct: 1
      },
      {
        question: "Which of the following can be solved using two pointers?",
        options: ["Matrix multiplication", "Finding the maximum sum subarray", "Finding if there are two numbers that add up to a target in a sorted array", "Binary search on unsorted data"],
        correct: 2
      },
      {
        question: "When should you consider using two pointers?",
        options: ["When the input is a graph", "When dealing with sorted arrays where you need to find pairs that meet a condition", "When implementing hash tables", "When working with recursion"],
        correct: 1
      }
    ],
  },
  {
    id: "3",
    title: "Sliding Window",
    summary: "Fixed vs. variable",
    level: 3,
    study_material: ["youtube.com/sliding-window", "google.com/search?q=sliding+window+algorithm"],
    status: "todo" as const,
    questions: [
      {
        question: "What is the main advantage of the sliding window technique?",
        options: ["Reduces space complexity to O(1)", "Eliminates the need for loops", "Works only on sorted arrays", "Can be used for all algorithmic problems"],
        correct: 0
      },
      {
        question: "In a fixed-size sliding window, what is typically maintained?",
        options: ["A queue", "A stack", "Window size and current sum/max/min within window", "Number of unique elements"],
        correct: 2
      },
      {
        question: "Which of these problems can be solved using sliding window?",
        options: ["Longest substring without repeating characters", "Finding the minimum in a stack", "Binary tree traversal", "Graph coloring"],
        correct: 0
      },
      {
        question: "Variable-size sliding window is useful when:",
        options: ["You know the exact window size", "The window size needs to adjust based on a condition", "Working with matrices", "Finding the median of an array"],
        correct: 1
      }
    ],
  },
];
