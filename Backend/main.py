from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy import text, create_engine
import os

# --- KONFIGURACJA ---
load_dotenv()

app = FastAPI()

# Middleware - pozwala frontendowi (domyślnie na porcie 5173) łączyć się z backendem
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # W produkcji zmień na konkretny adres, np. ["http://localhost:5173"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELE ---
class AnalyzeRequest(BaseModel):
    lat: float
    lon: float
    type: str = "kawiarnia" # Domyślna wartość
    radius: int = 500

# --- POŁĄCZENIE Z BAZĄ ---
def get_db_engine():
    try:
        # Konstrukcja URL połączenia
        DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:5432/{os.getenv('DB_NAME')}"
        engine = create_engine(
            DATABASE_URL,
            connect_args={"options": "-c client_encoding=utf8"}
        )
        return engine
    except Exception as e:
        print(f"Błąd konfiguracji DB: {e}")
        return None

# --- ENDPOINTY ---
@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Backend działa i jest gotowy na przyjęcie Godzilli."}

@app.post("/api/analyze")
def analyze_point(request: AnalyzeRequest):
    engine = get_db_engine()
    if not engine:
        raise HTTPException(status_code=500, detail="Nie można połączyć się z bazą danych.")

    # Logowanie zapytania
    print(f"Analiza punktu: {request.lat}, {request.lon}, Typ: {request.type}")

    sql = text("""
    SELECT * FROM calculate_hierarchical_score(
        ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(:x, :y), 4326), 2180)),
        ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(:x, :y), 4326), 2180)),
        :r,
        :type
    );
    """)

    params = {
        "x": request.lon,
        "y": request.lat,
        "r": request.radius,
        "type": request.type
    }

    try:
        with engine.connect() as conn:
            # Wykonanie procedury
            result = conn.execute(sql, params).mappings().fetchone()
            
            if result:
                response = dict(result)
                # Upewnij się, że zwracamy format, którego oczekuje frontend
                # Jeśli funkcja SQL zwraca kolumnę o nazwie 'score' lub 'total_score', to super.
                # Jeśli nie, backend zwróci to co daje baza.
                print("Wynik z bazy:", response)
                return response
            else:
                return {"score": 0, "message": "Brak danych dla tego punktu"}

    except Exception as e:
        print(f"Błąd SQL: {e}")
        # Na potrzeby demo zwracamy mocka w przypadku błędu bazy, żeby frontend nie padł
        return {
            "error": str(e),
            "score": 0, 
            "note": "Błąd bazy danych - upewnij się, że funkcja calculate_hierarchical_score istnieje."
        }