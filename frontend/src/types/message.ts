export interface Message {
  id: number;
  text: string;
  sender:  'teacher' | 'student';
  timestamp: Date;
  role?: 'teacher' | 'student';
  vacancy?: {
    id: number;
    title: string;
    salary: string;
    city: string;
    url: string;
    description?: string;
    recommendedByCurator?: boolean;
  };
}