import { DiagramType, Template } from './types';

export const INITIAL_CODE = `graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`;

export const TEMPLATES: Template[] = [
  {
    name: 'Simple Flowchart',
    type: DiagramType.Flowchart,
    description: 'Basic process flow',
    code: `graph TD
    A[Start] --> B{Decision}
    B -- Yes --> C[Process 1]
    B -- No --> D[Process 2]
    C --> E[End]
    D --> E`
  },
  {
    name: 'Sequence Diagram',
    type: DiagramType.Sequence,
    description: 'Interaction between components',
    code: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: I am good thanks!
    Bob->>John: How about you John?
    John-->>Alice: I am good too!`
  },
  {
    name: 'Gantt Chart',
    type: DiagramType.Gantt,
    description: 'Project timeline',
    code: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2014-01-12  , 12d
    another task      : 24d`
  },
  {
    name: 'Class Diagram',
    type: DiagramType.Class,
    description: 'Object-oriented structure',
    code: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    class Animal{
      +int age
      +String gender
      +isMammal()
      +mate()
    }
    class Duck{
      +String beakColor
      +swim()
      +quack()
    }`
  },
  {
    name: 'State Diagram',
    type: DiagramType.State,
    description: 'State machine transitions',
    code: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`
  }
];
