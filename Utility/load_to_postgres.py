from sqlalchemy import create_engine
import geopandas as gpd

def import_geojson_to_postgis(table_name, geojson, user, password, host, port, database):


    engine = create_engine(f"postgresql://{user}:{password}@{host}:{port}/{database}")
    try:
        gdf = gpd.read_file(geojson)
        gdf = gdf.to_crs(2180)
        gdf.to_postgis(table_name, engine, if_exists='replace', index=False)
        print(f"Data from {geojson} has been successfully loaded into the table {table_name} in the {database} database")
    except FileNotFoundError as e:
        print(f"Error: {e}. Please make sure the GeoJSON file exists.")
    except Exception as e:
        print(f"An error occurred: {e}")



import_geojson_to_postgis("sieci_drogi", " ", 5432)