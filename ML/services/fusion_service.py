def calculate_fusion_score(severity_level: float, heat_index_c: float, satellite_lst_c: float) -> dict:
    citizen_score = (max(1.0, min(5.0, severity_level)) / 5.0) * 100.0
    weather_score = max(0.0, min(100.0, ((heat_index_c - 25.0) / 25.0) * 100.0))
    satellite_score = max(0.0, min(100.0, ((satellite_lst_c - 30.0) / 25.0) * 100.0))

    heat_score = round(0.30 * citizen_score + 0.35 * weather_score + 0.35 * satellite_score, 1)
    risk_level = "extreme" if heat_score >= 75.0 else ("high" if heat_score >= 55.0 else ("moderate" if heat_score >= 35.0 else "low"))
    qc_score = round(min(1.0, 0.70 + 0.30 * (1.0 - abs(weather_score - satellite_score) / 100.0)), 2)

    return {
        "heatScore": heat_score,
        "heatRiskLevel": risk_level,
        "qualityControlScore": qc_score,
        "sources": {"sensor": True, "satellite": "MODIS/Landsat LST", "weather": "OpenWeather/WeatherAPI"}
    }
