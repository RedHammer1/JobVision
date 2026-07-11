export interface VacancyData {
    title: string;
    salary: string;
    city: string;
    url: string;
}

export const formatVacancyMessage = (vacancy: VacancyData): string => {
    return `${vacancy.title}\n ${vacancy.salary || 'Зарплата не указана'}\n ${vacancy.city || 'Город не указан'}\n ${vacancy.url || 'Ссылка отсутствует'}`;
};

export const vacancyTemplate = (vacancy: VacancyData): string => {
    return `
        <div class="vacancy-template">
            <div class="vacancy-template__title">${vacancy.title}</div>
            <div class="vacancy-template__details">
                <div class="vacancy-template__detail">${vacancy.salary || 'Зарплата не указана'}</div>
                <div class="vacancy-template__detail">${vacancy.city || 'Город не указан'}</div>
                <div class="vacancy-template__detail">
                    <a href="${vacancy.url || '#'}" target="_blank">Перейти к вакансии</a>
                </div>
            </div>
        </div>
    `;
};

export const isVacancyTemplate = (text: string): boolean => {
    return text.includes('💼') && 
           text.includes('💰') && 
           text.includes('📍') && 
           text.includes('🔗');
};

export const parseVacancyFromMessage = (text: string): VacancyData | null => {
    if (!isVacancyTemplate(text)) return null;
    
    const lines = text.split('\n');
    const result: VacancyData = {
        title: '',
        salary: '',
        city: '',
        url: ''
    };
    
    for (const line of lines) {
        if (line.includes('💼')) {
            result.title = line.replace('💼', '').trim();
        } else if (line.includes('💰')) {
            result.salary = line.replace('💰', '').trim();
        } else if (line.includes('📍')) {
            result.city = line.replace('📍', '').trim();
        } else if (line.includes('🔗')) {
            result.url = line.replace('🔗', '').trim();
        }
    }
    
    return result;
};