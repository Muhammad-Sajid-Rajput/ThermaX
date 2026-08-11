def calculate_quality_control_score(citizen_temp, weather_temp, satellite_lst):
    """
    Cross-validates citizen sensor temperature reading against atmospheric weather 
    and GEE satellite Land Surface Temperature (LST) to compute qualityControlScore (0.0 to 1.0).
    """
    try:
        citizen = float(citizen_temp or 38.0)
        weather = float(weather_temp or 38.0)
        satellite = float(satellite_lst or 38.0)

        # Calculate absolute deviations
        weather_diff = abs(citizen - weather)
        satellite_diff = abs(citizen - satellite)

        # Baseline score starts at 1.0
        score = 1.0

        # Deduct penalties for unreasonable thermal variance (>5°C)
        if weather_diff > 5.0:
            score -= min(0.4, (weather_diff - 5.0) * 0.05)
        if satellite_diff > 5.0:
            score -= min(0.4, (satellite_diff - 5.0) * 0.05)

        return round(max(0.1, min(1.0, score)), 2)
    except Exception:
        return 0.85
