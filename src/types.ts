export interface Game {
  id: string;
  title: string;
  namespace: string;
  description: string;
  category: string;
  orientation: string;
  quality_score: number;
  width: number;
  height: number;
  banner_image: string;
  image: string;
  url: string;
}

export interface GamesResponse {
  items: Game[];
  page: number;
  pagination: number;
  total: number;
  hasMore: boolean;
}
