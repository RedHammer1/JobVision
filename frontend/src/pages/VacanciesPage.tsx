import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import VacancyShareModal from '../components/VacancyShareModal/VacancyShareModal';
import { fetchVacanciesPaginated, searchVacanciesPaginated } from '../api/vacancies';
import type { Vacancy } from '../types/vacancy';
import { getUserChats, type Chat } from '../api/chats';
import './Page.css';

const API_URL = 'http://localhost:8080/api';

const VacanciesPage: React.FC = () => {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const isTeacher = user?.role === 'teacher';

  const loadVacancies = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await fetchVacanciesPaginated(pageNum, limit);
      setVacancies(response.data || []);
      setTotalPages(response.pagination.totalPages || 1);
      setTotal(response.pagination.total || 0);
    } catch (err) {
      console.error('Ошибка загрузки вакансий:', err);
      setVacancies([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const searchVacancies = useCallback(async (pageNum: number, query: string) => {
    setLoading(true);
    try {
      const response = await searchVacanciesPaginated(query, pageNum, limit);
      setVacancies(response.data || []);
      setTotalPages(response.pagination.totalPages || 1);
      setTotal(response.pagination.total || 0);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setVacancies([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserChats(user.id);
      setChats(data || []);
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err);
      setChats([]);
    }
  }, [user]);

  useEffect(() => {
    if (activeSearch) {
      searchVacancies(page, activeSearch);
    } else {
      loadVacancies(page);
    }
  }, [page, activeSearch, loadVacancies, searchVacancies]);

  useEffect(() => {
    if (user) loadChats();
  }, [user, loadChats]);

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    if (trimmed === activeSearch) {
      setPage(1);
      return;
    }
    setActiveSearch(trimmed);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleShareVacancy = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy);
    setShowShareModal(true);
  };

  const handleShareToChat = async (chatId: number, vacancyId: string, message: string, isRecommendation: boolean) => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/chats/${user.id}/chat/${chatId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: message,
            vacancyId: vacancyId,
            recommendedBy: isRecommendation ? user.id : undefined
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка отправки');
      }

      alert('Вакансия отправлена в чат!');
    } catch (err) {
      console.error('Ошибка отправки вакансии:', err);
      alert('Не удалось отправить вакансию');
    }
  };

  if (loading && page === 1 && !activeSearch) {
    return <div className="page-loading">Загрузка вакансий...</div>;
  }

  return (
    <div className="page vacancies-page">
      <div className="vacancies-page__header">
        <h1 className="page__title">Вакансии</h1>
        <div className="vacancies-page__search">
          <div className="search-container">
            <input
              type="text"
              className="vacancies-page__search-input"
              placeholder="Поиск вакансий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button 
              className="search-btn"
              onClick={handleSearch}
              disabled={loading}
              title="Найти"
            >
              Поиск
            </button>
            {activeSearch && (
              <button 
                className="search-clear-btn"
                onClick={handleClearSearch}
                title="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
      
      <p className="page__description">
        {activeSearch ? (
          <>Результаты поиска: <strong>"{activeSearch}"</strong> — найдено <strong>{total}</strong> вакансий</>
        ) : (
          <>Всего вакансий: <strong>{total}</strong></>
        )}
      </p>

      {loading ? (
        <div className="loading-spinner">Загрузка...</div>
      ) : (
        <>
          <div className="vacancies-list">
            {vacancies.length === 0 ? (
              <div className="vacancies-empty">
                {activeSearch ? (
                  <>
                    <div className="empty-icon">🔍</div>
                    <h3>Ничего не найдено</h3>
                    <p>По запросу "<strong>{activeSearch}</strong>" вакансий не найдено</p>
                    <button className="clear-search-btn" onClick={handleClearSearch}>
                      Очистить поиск
                    </button>
                  </>
                ) : (
                  <>
                    <div className="empty-icon">💼</div>
                    <h3>Вакансии не найдены</h3>
                    <p>Попробуйте обновить страницу или изменить параметры поиска</p>
                  </>
                )}
              </div>
            ) : (
              vacancies.map((vacancy) => (
                <div key={vacancy.id} className="vacancy-card">
                  <div className="vacancy-card__header">
                    <h3 className="vacancy-card__title">{vacancy.title || 'Без названия'}</h3>
                    <span className="vacancy-card__badge">💼</span>
                  </div>
                  <div className="vacancy-card__details">
                    <div className="vacancy-card__detail">
                      <span className="vacancy-card__icon">💰</span>
                      <span className="vacancy-card__text">{vacancy.salary || 'Не указана'}</span>
                    </div>
                    <div className="vacancy-card__detail">
                      <span className="vacancy-card__icon">📍</span>
                      <span className="vacancy-card__text">{vacancy.city || 'Не указан'}</span>
                    </div>
                  </div>
                  <div className="vacancy-card__footer">
                    <a href={vacancy.url} target="_blank" rel="noopener noreferrer" className="vacancy-card__link">
                      Подробнее →
                    </a>
                    <button
                      className="vacancy-card__share-btn"
                      onClick={() => handleShareVacancy(vacancy)}
                    >
                      📤 Отправить в чат
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination__btn"
              >
                ← Назад
              </button>
              <span className="pagination__info">
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagination__btn"
              >
                Вперед →
              </button>
            </div>
          )}
        </>
      )}

      <VacancyShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        vacancy={selectedVacancy}
        chats={chats}
        currentUserId={user?.id || 0}
        onShare={handleShareToChat}
      />
    </div>
  );
};

export default VacanciesPage;