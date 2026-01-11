CREATE OR REPLACE FUNCTION calculate_hierarchical_score(
    input_x double precision,
    input_y double precision,
    radius_meters integer,
    input_biz_type text -- NOWOŚĆ: Podajemy tylko typ (np. 'kawiarnia')
)
RETURNS TABLE (
    total_score integer,
    category_scores json,
    sub_scores json,
    catchment_geojson json
) AS $$
DECLARE
    -- Zmienna na JSON z bazy
    profile_data jsonb;
    -- Zmienne na Wagi (wczytamy je z JSONa)
    w_school float; w_uni float; w_shop float; w_mall float; w_sport float;
    w_comp_cafe float; w_comp_rest float; w_comp_bar float;
    w_park float; w_stop float; w_res float;
    w_main_public float; w_main_trans float; w_main_res float; w_main_comp float;

    -- Zmienne na Targety (też z JSONa!)
    tgt_school float; tgt_uni float; tgt_shop float; tgt_mall float; tgt_sport float;
    tgt_comp_cafe float; tgt_comp_rest float; tgt_comp_bar float;
    tgt_park float; tgt_stop float; tgt_res_pop float;

    -- Reszta zmiennych roboczych (bez zmian)
    user_point geometry; iso_geometry geometry;
    c_school float; c_uni float; c_shop float; c_mall float; c_sport float;
    c_cafe float; c_rest float; c_bar float;
    c_park float; c_stop float; c_res float;
    s_school float; s_uni float; s_shop float; s_mall float; s_sport float;
    s_cafe float; s_rest float; s_bar float;
    s_park float; s_stop float; s_res float;
    score_grp_public float := 0; score_grp_trans float := 0;
    score_grp_res float := 0; score_grp_comp float := 0;
    final_score float := 0;
    sum_w_pub float; sum_w_trans float; sum_w_comp float; sum_w_main float;
BEGIN
    -- 1. POBIERANIE KONFIGURACJI Z BAZY
    SELECT config INTO profile_data
    FROM business_profiles
    WHERE profile_key = lower(input_biz_type);

    -- Fallback: Jak nie znaleziono, bierzemy 'kawiarnia' jako domyślny
    IF profile_data IS NULL THEN
        SELECT config INTO profile_data FROM business_profiles WHERE profile_key = 'kawiarnia';
    END IF;

    -- 2. ROZPAKOWYWANIE JSONA DO ZMIENNYCH
    -- Wagi Główne
    w_main_public := COALESCE((profile_data->'main'->>'public')::float, 1.0);
    w_main_trans  := COALESCE((profile_data->'main'->>'transport')::float, 1.0);
    w_main_res    := COALESCE((profile_data->'main'->>'residents')::float, 1.0);
    w_main_comp   := COALESCE((profile_data->'main'->>'competition')::float, 1.0);

    -- Wagi Podkategorii
    w_school := COALESCE((profile_data->'subs'->>'pub_school')::float, 1.0);
    w_uni    := COALESCE((profile_data->'subs'->>'pub_uni')::float, 1.0);
    w_shop   := COALESCE((profile_data->'subs'->>'pub_shop')::float, 1.0);
    w_mall   := COALESCE((profile_data->'subs'->>'pub_mall')::float, 1.0);
    w_sport  := COALESCE((profile_data->'subs'->>'pub_sport')::float, 1.0);
    w_comp_cafe := COALESCE((profile_data->'subs'->>'comp_cafe')::float, 1.0);
    w_comp_rest := COALESCE((profile_data->'subs'->>'comp_rest')::float, 1.0);
    w_comp_bar  := COALESCE((profile_data->'subs'->>'comp_bar')::float, 1.0);
    w_park   := COALESCE((profile_data->'subs'->>'trans_park')::float, 1.0);
    w_stop   := COALESCE((profile_data->'subs'->>'trans_stop')::float, 1.0);
    w_res    := COALESCE((profile_data->'subs'->>'res_housing')::float, 1.0);

    -- Targety (Nasycenie)
    tgt_school := COALESCE((profile_data->'targets'->>'pub_school')::float, 4.0);
    tgt_uni    := COALESCE((profile_data->'targets'->>'pub_uni')::float, 2.0);
    tgt_shop   := COALESCE((profile_data->'targets'->>'pub_shop')::float, 10.0);
    tgt_mall   := COALESCE((profile_data->'targets'->>'pub_mall')::float, 1.0);
    tgt_sport  := COALESCE((profile_data->'targets'->>'pub_sport')::float, 3.0);
    tgt_comp_cafe := COALESCE((profile_data->'targets'->>'comp_cafe')::float, 4.0);
    tgt_comp_rest := COALESCE((profile_data->'targets'->>'comp_rest')::float, 8.0);
    tgt_comp_bar  := COALESCE((profile_data->'targets'->>'comp_bar')::float, 5.0);
    tgt_park   := COALESCE((profile_data->'targets'->>'trans_park')::float, 5000.0);
    tgt_stop   := COALESCE((profile_data->'targets'->>'trans_stop')::float, 6.0);
    tgt_res_pop := COALESCE((profile_data->'targets'->>'res_housing')::float, 5000.0);

    -- 3. geometryETRIA
    user_point := ST_SetSRID(ST_MakePoint(input_x, input_y), 2180);
    iso_geometry := ST_SetSRID(ST_Buffer(user_point, radius_meters), 2180);


    -- 4. ZLICZANIE (Logika bez zmian, ale teraz wagi są już wczytane)
    -- Ludność
-- Poprawka w funkcji (sekcja geometryczna)
-- Ostateczna wersja pancernego zapytania
-- 4. ZLICZANIE LUDNOŚCI (Metoda Proporcji Powierzchni)
    -- Wzór: (Powierzchnia przecięcia / Cała powierzchnia poligonu) * Liczba ludzi w poligonie

    SELECT COALESCE(SUM(
        ((ST_Area(ST_Intersection(l.geometry, iso_geometry)) / ST_Area(l.geometry))
        * l.r_ogolem)/69 -- <--- TU WPISZ SWOJĄ NAZWĘ KOLUMNY (np. total, val, pop)
    ), 0)
    INTO c_res
    FROM a_ludnosc l
    WHERE ST_Intersects(l.geometry, iso_geometry);
    -- Transport
    SELECT COUNT(*) INTO c_stop FROM transport WHERE fclass IN ('bus_stop', 'tram_stop', 'railway_station') AND ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(ST_Area(geometry)), 0) INTO c_park FROM traffic_a WHERE fclass = 'parking' AND ST_DWithin(geometry, user_point, radius_meters);
    -- Reszta (Tabele)
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_school FROM a_schools WHERE ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_uni    FROM a_universities WHERE ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_shop   FROM a_shops WHERE ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_mall   FROM a_malls WHERE ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_sport  FROM a_sport WHERE ST_DWithin(geometry, user_point, radius_meters);

    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_cafe   FROM a_cafes WHERE ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_rest   FROM a_restaurants WHERE ST_DWithin(geometry, user_point, radius_meters);
    SELECT COALESCE(SUM(CASE WHEN ST_DWithin(geometry, user_point, radius_meters*0.4) THEN 1.0 ELSE 0.5 END), 0) INTO c_bar    FROM a_bars WHERE ST_DWithin(geometry, user_point, radius_meters);

    -- 5. NORMALIZACJA (Używamy pobranych Targetów)
    s_res    := LEAST(c_res    / tgt_res_pop, 1.0) * 100.0;
    s_park   := LEAST(c_park   / tgt_park,    1.0) * 100.0;
    s_stop   := LEAST(c_stop   / tgt_stop,    1.0) * 100.0;
    s_school := LEAST(c_school / tgt_school, 1.0) * 100.0;
    s_uni    := LEAST(c_uni    / tgt_uni,    1.0) * 100.0;
    s_shop   := LEAST(c_shop   / tgt_shop,   1.0) * 100.0;
    s_mall   := LEAST(c_mall   / tgt_mall,   1.0) * 100.0;
    s_sport  := LEAST(c_sport  / tgt_sport,  1.0) * 100.0;
    s_cafe   := 100.0 - (LEAST(c_cafe / tgt_comp_cafe, 1.0) * 100.0);
    s_rest   := 100.0 - (LEAST(c_rest / tgt_comp_rest, 1.0) * 100.0);
    s_bar    := 100.0 - (LEAST(c_bar  / tgt_comp_bar,  1.0) * 100.0);

    -- 6. AGREGACJA (Używamy pobranych Wag)
    sum_w_pub := w_school + w_uni + w_shop + w_mall + w_sport;
    IF sum_w_pub > 0 THEN score_grp_public := (s_school*w_school + s_uni*w_uni + s_shop*w_shop + s_mall*w_mall + s_sport*w_sport) / sum_w_pub; END IF;
    sum_w_trans := w_park + w_stop;
    IF sum_w_trans > 0 THEN score_grp_trans := (s_park*w_park + s_stop*w_stop) / sum_w_trans; END IF;
    sum_w_comp := w_comp_cafe + w_comp_rest + w_comp_bar;
    IF sum_w_comp > 0 THEN score_grp_comp := (s_cafe*w_comp_cafe + s_rest*w_comp_rest + s_bar*w_comp_bar) / sum_w_comp; ELSE score_grp_comp := 100; END IF;
    score_grp_res := s_res;

    -- 7. FINAŁ
    sum_w_main := w_main_public + w_main_trans + w_main_res + w_main_comp;
    IF sum_w_main > 0 THEN
        final_score := (score_grp_public * w_main_public + score_grp_trans * w_main_trans + score_grp_res * w_main_res + score_grp_comp * w_main_comp) / sum_w_main;
    END IF;

    RETURN QUERY SELECT
        ROUND(final_score)::integer,
        json_build_object('public', ROUND(score_grp_public), 'transport', ROUND(score_grp_trans), 'residents', ROUND(score_grp_res), 'competition', ROUND(score_grp_comp)),
        json_build_object('uni_count', c_uni, 'pop_count', c_res, 'stop_count', c_stop, 'park_sqm', c_park),
        ST_AsGeoJSON(iso_geometry)::json;
END;
$$ LANGUAGE plpgsql;