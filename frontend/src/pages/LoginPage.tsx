import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Заполните все поля');
            return;
        }

        setLoading(true);

        try {
            await login(email, password);
            navigate('/vacancies');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page__container">
                <div className="auth-page__logo">
                    <span className="auth-page__logo-icon">📊</span>
                    <span className="auth-page__logo-text">JobVision</span>
                </div>
                <h1 className="auth-page__title">Вход</h1>
                <p className="auth-page__subtitle">Войдите в свой аккаунт, чтобы продолжить</p>
                
                {error && <div className="auth-page__error">{error}</div>}
                
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-form__group">
                        <label className="auth-form__label">Email</label>
                        <input
                            type="email"
                            className="auth-form__input"
                            placeholder="example@mail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="auth-form__group">
                        <label className="auth-form__label">Пароль</label>
                        <input
                            type="password"
                            className="auth-form__input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="auth-form__button" disabled={loading}>
                        {loading ? 'Вход...' : 'Войти'}
                    </button>
                </form>
                <p className="auth-page__switch">
                    Нет аккаунта? <Link to="/register" className="auth-page__link">Зарегистрироваться</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;