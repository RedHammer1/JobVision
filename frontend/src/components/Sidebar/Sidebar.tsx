import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name);
      } catch {
        setUserName(null);
      }
    }
  }, []);

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    closeMobile();
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMobileOpen]);

  return (
    <>
      <button className="sidebar__burger" onClick={toggleMobile} aria-label="Открыть меню">
        <span className="sidebar__burger-line"></span>
        <span className="sidebar__burger-line"></span>
        <span className="sidebar__burger-line"></span>
      </button>

      <nav className={`sidebar ${isMobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">📊</span>
          <span className="sidebar__logo-text">JobVision</span>
        </div>

        {userName && (
          <div className="sidebar__user">
            <span className="sidebar__user-icon">👤</span>
            <span className="sidebar__user-name">{userName}</span>
          </div>
        )}

        <ul className="sidebar__nav">
          <li>
            <NavLink to="/vacancies" className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`} onClick={closeMobile}>
              <span className="sidebar__icon">💼</span>
              <span className="sidebar__label">Вакансии</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/messenger" className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`} onClick={closeMobile}>
              <span className="sidebar__icon">💬</span>
              <span className="sidebar__label">Мессенджер</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/tests" className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`} onClick={closeMobile}>
              <span className="sidebar__icon">📝</span>
              <span className="sidebar__label">Тесты</span>
            </NavLink>
          </li>

          <li className="sidebar__separator"></li>
          <li>
            <button className="sidebar__link sidebar__link--logout" onClick={handleLogout}>
              <span className="sidebar__icon">🚪</span>
              <span className="sidebar__label">Выйти</span>
            </button>
          </li>
        </ul>
      </nav>

      {isMobileOpen && <div className="sidebar__overlay" onClick={closeMobile}></div>}
    </>
  );
};

export default Sidebar;