from sqlalchemy import Column, String, Text, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(String(50), primary_key=True)
    title = Column(Text, nullable=False)
    salary = Column(Text)
    url = Column(Text)
    city = Column(String(50), nullable=False)

    def __repr__(self):
        return f"<Vacancy {self.title} ({self.city})>"