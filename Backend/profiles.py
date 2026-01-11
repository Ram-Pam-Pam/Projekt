PROFILES = {
    # =========================================================
    # 1. KAWIARNIA (CSV)
    # =========================================================
    "kawiarnia": {
        "main": { "competition": 5.0, "public": 5.0, "residents": 4.0, "transport": 2.0 },
        "subs": {
            # Konkurencja
            "comp_cafe": 5.0, "comp_rest": 3.0, "comp_bar": 1.0,
            # Publiczne
            "pub_uni": 5.0, "pub_mall": 4.0, "pub_shop": 3.0, "pub_school": 2.0, "pub_sport": 1.0,
            # Ludność (Z tabeli 'ludnosc')
            "res_housing": 4.0,
            # Transport
            "trans_stop": 4.0, # (bus/tram/rail) - BEZ TAXI
            "trans_park": 2.0  # (traffic_a)
        },
        "targets": { 
            "pub_uni": 2, "pub_school": 4, "pub_shop": 10, "pub_mall": 1, "pub_sport": 2,
            "trans_stop": 6, "trans_park": 5000, "res_housing": 5000.0,
            "comp_cafe": 4, "comp_rest": 8, "comp_bar": 5
        }
    },
 
    # =========================================================
    # 2. RESTAURACJA
    # =========================================================
    "restauracja": {
        "main": { "competition": 3.0, "public": 4.0, "residents": 5.0, "transport": 3.0 },
        "subs": {
            "comp_cafe": 1.0, "comp_rest": 4.0, "comp_bar": 2.0,
            "pub_uni": 2.0, "pub_mall": 4.0, "pub_shop": 2.0, "pub_school": 1.0, "pub_sport": 1.0,
            "res_housing": 5.0,
            "trans_stop": 3.0, "trans_park": 4.0
        },
        "targets": { 
            "pub_uni": 2, "pub_school": 4, "pub_shop": 10, "pub_mall": 1, "pub_sport": 2,
            "trans_stop": 6, "trans_park": 10000, "res_housing": 5000.0,
            "comp_cafe": 10, "comp_rest": 5, "comp_bar": 10
        }
    },
 
    # =========================================================
    # 3. SKLEP
    # =========================================================
    "sklep": {
        "main": { "competition": 4.0, "public": 2.0, "residents": 5.0, "transport": 4.0 },
        "subs": {
            "comp_cafe": 0.0, "comp_rest": 0.0, "comp_bar": 0.0,
            "pub_uni": 1.0, "pub_mall": 1.0, "pub_shop": 3.0, "pub_school": 3.0, "pub_sport": 1.0,
            "res_housing": 5.0,
            "trans_stop": 2.0, "trans_park": 5.0
        },
        "targets": { 
            "res_housing": 3000.0, "trans_park": 8000, "pub_school": 3,
            "comp_cafe": 10, "comp_rest": 10, "comp_bar": 10 
        }
    },
    # =========================================================
    # 4. SIŁOWNIA
    # =========================================================
    "silownia": {
        "main": { "competition": 3.0, "public": 3.0, "residents": 4.0, "transport": 5.0 },
        "subs": {
            "comp_cafe": 0.0, "comp_rest": 0.0, "comp_bar": 0.0,
            "pub_uni": 4.0, "pub_mall": 2.0, "pub_shop": 1.0, "pub_school": 1.0, "pub_sport": 5.0,
            "res_housing": 4.0,
            "trans_stop": 3.0, "trans_park": 5.0
        },
        "targets": { 
            "trans_park": 20000, "res_housing": 8000.0, "pub_uni": 3, "pub_sport": 4,
            "comp_cafe": 10, "comp_rest": 10, "comp_bar": 10
        }
    },
    # =========================================================
    # 5. PUB / BAR
    # =========================================================
    "pub": {
        "main": { "competition": 2.0, "public": 5.0, "residents": 3.0, "transport": 5.0 },
        "subs": {
            "comp_cafe": 1.0, "comp_rest": 2.0, "comp_bar": 2.0,
            "pub_uni": 5.0, "pub_mall": 1.0, "pub_shop": 1.0, "pub_school": 0.0, "pub_sport": 1.0,
            "res_housing": 3.0,
            "trans_stop": 5.0, "trans_park": 0.0
        },
        "targets": { 
            "pub_uni": 5, "trans_stop": 10, "res_housing": 3000.0,
            "comp_cafe": 10, "comp_rest": 10, "comp_bar": 15
        }
    }
}