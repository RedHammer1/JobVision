import os
from avito_scraper import scrape_avito_vacancies
from db import engine
from models import Base
from tabulate import tabulate
from dotenv import load_dotenv
from sqlalchemy import inspect

load_dotenv()

def print_vacancies_table(vacancies):
    if not vacancies:
        print("Нет вакансий.")
        return
    headers = ["№", "Вакансия", "Зарплата", "Ссылка"]
    table_data = []
    for idx, v in enumerate(vacancies, 1):
        table_data.append([
            idx, 
            v['title'], 
            v['salary'],
            v['url'][:60] + "..."
        ])
    print(tabulate(table_data, headers=headers, tablefmt="grid"))

def main():
    city = "moskva"
    max_pages = 40
    
    print(f"Скрапинг вакансий Avito в городе {city} (максимум {max_pages} страниц)...")

    inspector = inspect(engine)
    if not inspector.has_table("vacancies"):
        Base.metadata.create_all(engine)
        print("Таблица vacancies создана.")
    else:
        print("Таблица vacancies уже существует, пропускаем создание.")

    vacancies = scrape_avito_vacancies(city=city, headless=True, max_pages=max_pages)
    
    if vacancies:
        print_vacancies_table(vacancies[:20])
        if len(vacancies) > 20:
            print(f"... и еще {len(vacancies) - 20} вакансий")
        
        print(f"Всего сохранено {len(vacancies)} записей в БД.")
    else:
        print("Вакансии не найдены.")

if __name__ == "__main__":
    main()