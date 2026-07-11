import React from 'react';
import { useLocation } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('vacancies')) return 'Вакансии';
    if (path.includes('messenger')) return 'Мессенджер';
    if (path.includes('profile')) return 'Профиль';
    return 'Главная';
  };

  return (
    <header className="header">
      <div className="header__container">
        <h1 className="header__title">{getPageTitle()}</h1>
      </div>
    </header>
  );
};

export default Header;