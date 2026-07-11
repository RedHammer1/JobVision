import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import Vacancy

load_dotenv()
DATABASE_URL = "postgresql://admin:password@localhost:5432/messenger_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def save_vacancies(vacancies: list, city: str):
    from sqlalchemy.dialects.postgresql import insert
    import hashlib

    with SessionLocal() as session:
        for vac in vacancies:
            vacancy_id = hashlib.md5(vac["url"].encode()).hexdigest()[:50]
            
            stmt = insert(Vacancy).values(
                id=vacancy_id,
                title=vac["title"],
                salary=vac["salary"],
                url=vac["url"],
                city=city
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=['id'],
                set_={
                    "title": stmt.excluded.title,
                    "salary": stmt.excluded.salary
                }
            )
            session.execute(stmt)
        session.commit()