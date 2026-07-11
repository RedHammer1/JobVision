import React, { useState, useEffect } from 'react';
import './VacancyTestRequirementModal.css';

interface VacancyTestRequirementModalProps {
    isOpen: boolean;
    onClose: () => void;
    vacancy: {
        id: string;
        title: string;
        salary: string;
        city: string;
        url: string;
    };
    messageId: number;
    tests: Array<{
        id: number;
        title: string;
        description: string;
    }>;
    currentTestId?: number | null;
    userId: number;
    onSave: (vacancyId: string, testId: number | null, messageId: number) => Promise<void>;
}

const VacancyTestRequirementModal: React.FC<VacancyTestRequirementModalProps> = ({
    isOpen,
    onClose,
    vacancy,
    messageId,
    tests,
    currentTestId,
    userId,
    onSave
}) => {
    const [selectedTestId, setSelectedTestId] = useState<number | null>(currentTestId || null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedTestId(currentTestId || null);
        }
    }, [isOpen, currentTestId]);

    if (!isOpen || !vacancy) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(vacancy.id, selectedTestId, messageId);
            onClose();
        } catch (err) {
            console.error('Ошибка сохранения:', err);
            alert('Не удалось сохранить требование');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vacancy-requirement-overlay" onClick={onClose}>
            <div className="vacancy-requirement-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vacancy-requirement-header">
                    <h3>🔒 Требования к вакансии</h3>
                    <button className="vacancy-requirement-close" onClick={onClose}>✕</button>
                </div>

                <div className="vacancy-requirement-body">
                    <div className="vacancy-requirement-preview">
                        <h4>{vacancy.title}</h4>
                        <div className="vacancy-requirement-details">
                            <span>💰 {vacancy.salary}</span>
                            <span>📍 {vacancy.city}</span>
                        </div>
                        <a href={vacancy.url} target="_blank" rel="noopener noreferrer" className="vacancy-requirement-link">
                            🔗 {vacancy.url}
                        </a>
                    </div>

                    <div className="vacancy-requirement-select">
                        <label>Выберите тест для доступа к вакансии:</label>
                        <select
                            value={selectedTestId || ''}
                            onChange={(e) => setSelectedTestId(e.target.value ? parseInt(e.target.value) : null)}
                            className="vacancy-requirement-select-input"
                        >
                            <option value="">Нет требований (доступна всем)</option>
                            {tests.map(test => (
                                <option key={test.id} value={test.id}>
                                    {test.title} {test.description ? `- ${test.description}` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="vacancy-requirement-hint">
                            {selectedTestId ? (
                                <span className="hint-active">
                                    ✅ Для доступа к вакансии необходимо пройти тест "{tests.find(t => t.id === selectedTestId)?.title}"
                                </span>
                            ) : (
                                <span className="hint-inactive">
                                    ℹ️ Вакансия доступна всем пользователям без дополнительных требований
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="vacancy-requirement-footer">
                    <button className="vacancy-requirement-btn-cancel" onClick={onClose}>
                        Отмена
                    </button>
                    <button 
                        className="vacancy-requirement-btn-save"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Сохранение...' : '💾 Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VacancyTestRequirementModal;