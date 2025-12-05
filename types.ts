export enum DiagramType {
  Flowchart = 'Flowchart',
  Sequence = 'Sequence',
  Class = 'Class',
  State = 'State',
  Gantt = 'Gantt',
  Pie = 'Pie',
  ER = 'ER',
  Mindmap = 'Mindmap'
}

export interface Template {
  name: string;
  type: DiagramType;
  code: string;
  description: string;
}

export interface DiagramFile {
  id: string;
  name: string;
  code: string;
  type: 'macro' | 'micro'; // Logic distinction for organization
  updatedAt: number;
}

export interface GenerationConfig {
  prompt: string;
  diagramType?: DiagramType;
}

export interface AnalysisResult {
  suggestions: string[];
  syntaxValid: boolean;
  logicGaps: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
