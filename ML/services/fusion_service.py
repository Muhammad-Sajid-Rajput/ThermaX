from services.quality_control import calculate_quality_control_score

def calculate_fusion_score(severity_level: float, heat_index_c: float, satellite_lst_c: float) -> dict:
    citizen_score = (max(1.0, min(5.0, severity_level)) / 5.0) * 100.0
    weather_score = max(0.0, min(100.0, ((heat_index_c - 25.0) / 25.0) * 100.0))
    satellite_score = max(0.0, min(100.0, ((satellite_lst_c - 30.0) / 25.0) * 100.0))

    heat_score = round(0.30 * citizen_score + 0.35 * weather_score + 0.35 * satellite_score, 1)
    risk_level = "extreme" if heat_score >= 75.0 else ("high" if heat_score >= 55.0 else ("moderate" if heat_score >= 35.0 else "low"))
    qc_score = calculate_quality_control_score(severity_level * 8.0, heat_index_c, satellite_lst_c)

    return {
        "heatScore": heat_score,
        "heatRiskLevel": risk_level,
        "qualityControlScore": qc_score,
        "sources": {"sensor": True, "satellite": "MODIS/Landsat LST", "weather": "OpenWeather/WeatherAPI"}
    }

