import re
from transliterate import translit

def city_to_slug(city: str) -> str:
    slug = translit(city, 'ru', reversed=True) 
    slug = re.sub(r'[^\w\s-]', '', slug).strip().lower()
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug