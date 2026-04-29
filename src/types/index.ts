export interface ResultItem {
  id: string;
  source: string;
  title: string;
  type: string;
  thumbnail: string;
  url?: string;
  year?: string;
  description?: string;
  downloadUrl: string;
  downloads?: number;
  tags?: string[];
}
