import re
import requests
from bs4 import BeautifulSoup
import time

def clean_salary(text: str) -> str:
    if not text:
        return "з/п не указана"
    text = re.sub(r'\s+', ' ', text.strip())
    text = text.replace('—', '-')
    return text

def scrape_avito_vacancies(city: str = "moskva", headless: bool = True, max_pages: int = 3) -> list:
    all_vacancies = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    base_url = f"https://www.avito.ru/{city}/rabota"
    
    for page_num in range(1, max_pages + 1):
        url = f"{base_url}?p={page_num}" if page_num > 1 else base_url
        print(f"Скрапинг страницы {page_num}: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            items = soup.select('[data-marker="item"]')
            
            if not items:
                print(f"На странице {page_num} нет вакансий")
                break
            
            page_vacancies = []
            for item in items:
                try:
                    title_el = item.select_one('[data-marker="item-title"]')
                    title = title_el.text.strip() if title_el else ""
                    
                    href = title_el.get('href') if title_el else ""
                    full_url = "https://www.avito.ru" + href if href else ""
                    
                    price_el = item.select_one('[data-marker="item-price"]')
                    if not price_el:
                        price_el = item.select_one('.price')
                    salary = price_el.text.strip() if price_el else ""
                    
                    vacancy = {
                        "title": title,
                        "salary": clean_salary(salary),
                        "url": full_url,
                    }
                    page_vacancies.append(vacancy)
                    all_vacancies.append(vacancy)
                except Exception as e:
                    print(f"Ошибка парсинга вакансии на странице {page_num}: {e}")
                    continue
            
            print(f"На странице {page_num} найдено {len(page_vacancies)} вакансий")
            
            if page_vacancies:
                try:
                    from db import save_vacancies
                    save_vacancies(page_vacancies, city)
                    print(f"Страница {page_num} сохранена в БД")
                except Exception as e:
                    print(f"Ошибка сохранения страницы {page_num} в БД: {e}")
            
            if page_num < max_pages:
                time.sleep(2)
                
        except requests.exceptions.RequestException as e:
            print(f"Ошибка запроса к странице {page_num}: {e}")
            continue
    
    print(f"Всего собрано {len(all_vacancies)} вакансий")
    return all_vacancies