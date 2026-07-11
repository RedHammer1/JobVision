import type { Vacancy } from '../types/vacancy';

const API_URL = 'http://localhost:8080/api';

export interface PaginatedResponse {
  data: Vacancy[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    search?: string | null;
  };
}

export const fetchVacanciesPaginated = async (
  page: number = 1, 
  limit: number = 50
): Promise<PaginatedResponse> => {
  const url = `${API_URL}/vacancies?page=${page}&limit=${limit}`;
  
  console.log(`Запрос (обычный): ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Ошибка загрузки вакансий');
  
  const data = await response.json();
  console.log('Ответ сервера (обычный):', data);
  
  return data;
};

export const searchVacanciesPaginated = async (
  query: string,
  page: number = 1, 
  limit: number = 50
): Promise<PaginatedResponse> => {
  const url = `${API_URL}/vacancies/search?q=${encodeURIComponent(query.trim())}&page=${page}&limit=${limit}`;
  
  console.log(`Запрос (поиск): ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Ошибка поиска вакансий');
  
  const data = await response.json();
  console.log('Ответ сервера (поиск):', data);
  
  return data;
};