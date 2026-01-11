from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy import text, create_engine
import psycopg2
import os

# Models
class PointRequest(BaseModel):
    lat: float
    lon: float

# Loading data from .env file
def configure():
    load_dotenv()

app = FastAPI()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/analyze")
def analyze_point(point: PointRequest):
    configure()
    
    lat = point.lat
    lon = point.lon

    # Połączenie z bazą
    # conn = psycopg2.connect(
    #     host=os.getenv('DB_HOST'),
    #     database=os.getenv('DB_NAME'),
    #     user=os.getenv('DB_USER'),
    #     password=os.getenv('DB_PASSWORD')
    # )
    DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:5432/{os.getenv('DB_NAME')}"

    engine = create_engine(
        DATABASE_URL,
        connect_args = {"options": "-c client_encoding=utf8"}
    )
    
    # print("Lat", lat)
    # print("Lon", lon)

    sql = text("""
    SELECT * FROM calculate_hierarchical_score(
        ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(:x, :y), 4326), 2180)),
        ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(:x, :y), 4326), 2180)),
        :r,
        :type
    );
    """)

    params = {
        "x": point.lon,
        "y": point.lat,
        "r": 500,
        "type": "kawiarnia"
    }

    with engine.connect() as conn:
        result = conn.execute(sql, params).mappings().fetchone()
    
    response = dict(result)
    print(response)
    return response

    # Dla testu zwróć coś do frontendu
    # return {"lat": lat, "lon": lon, "message": "Dane odebrane poprawnie"}