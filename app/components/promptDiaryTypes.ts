export interface Prompt {
  id: string;
  abbreviation: string;
  description: string;
  fullPrompt: string;
  categoryIds: string[];
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}
