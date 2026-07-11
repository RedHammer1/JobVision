import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tag, setTag] = useState('');
    const [role, setRole] = useState<'student' | 'teacher'>('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !email || !password || !tag) {
            setError('Заполните все поля');
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }


        setLoading(true);

        try {
            await register(name, email, password, tag, role);
            navigate('/vacancies');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка регистрации');
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
                <h1 className="auth-page__title">Регистрация</h1>
                <p className="auth-page__subtitle">Создайте аккаунт для начала работы</p>
                
                {error && <div className="auth-page__error">{error}</div>}
                
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-form__group">
                        <label className="auth-form__label">Имя</label>
                        <input
                            type="text"
                            className="auth-form__input"
                            placeholder="Иван Иванов"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

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
                        <label className="auth-form__label">Тег</label>
                        <input
                            type="text"
                            className="auth-form__input"
                            placeholder="@username"
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            required
                            disabled={loading}
                        />
                        <span className="auth-form__hint">Уникальный идентификатор, начинается с @</span>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Роль</label>
                        <div className="auth-form__radio-group">
                            <label className="auth-form__radio">
                                <input
                                    type="radio"
                                    value="student"
                                    checked={role === 'student'}
                                    onChange={() => setRole('student')}
                                />
                                Студент
                            </label>
                            <label className="auth-form__radio">
                                <input
                                    type="radio"
                                    value="teacher"
                                    checked={role === 'teacher'}
                                    onChange={() => setRole('teacher')}
                                />
                                Преподаватель
                            </label>
                        </div>
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
                            minLength={6}
                        />
                        <span className="auth-form__hint">Минимум 6 символов</span>
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Подтверждение пароля</label>
                        <input
                            type="password"
                            className="auth-form__input"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="auth-form__button" disabled={loading}>
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>

                <p className="auth-page__switch">
                    Уже есть аккаунт? <Link to="/login" className="auth-page__link">Войти</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;