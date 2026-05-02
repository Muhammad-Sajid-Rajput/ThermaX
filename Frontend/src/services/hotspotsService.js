import { fetchHotspots as fetchHotspotsData } from './api.js';
class HotspotsService {
  /**
   * Get hotspots data with optional filters
   * @param {Object} filters - Filter options (area, severity, priority, etc.)
   * @returns {Promise<Object>} Hotspots data response
   */
  async getHotspotsData(filters = {}) {
    try {
      const response = await fetchHotspotsData(filters);
      return {
        success: true,
        data: response.data?.data || [],
        source: response.source,
        lastUpdated: response.lastUpdated,
      };
    } catch (error) {
      console.error('HotspotsService: Failed to fetch hotspots data:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
  /**
   * Get hotspots statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Hotspots statistics
   */
  async getHotspotsStats(filters = {}) {
    try {
      const response = await this.getHotspotsData(filters);
      if (!response.success) {
        return response;
      }
      const data = response.data;
      const stats = {
        totalHotspots: data.length,
        avgSeverity:
          data.reduce((sum, hotspot) => sum + hotspot.avgSeverity, 0) /
            data.length || 0,
        avgTemperature:
          data.reduce((sum, hotspot) => sum + hotspot.avgTemperature, 0) /
            data.length || 0,
        priorityDistribution: this.calculatePriorityDistribution(data),
        topRiskAreas: this.getTopRiskAreas(data),
      };
      return {
        success: true,
        data: stats,
        source: response.source,
      };
    } catch (error) {
      console.error('HotspotsService: Failed to calculate stats:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
  /**
   * Calculate priority distribution
   * @param {Array} data - Hotspots data
   * @returns {Object} Priority distribution
   */
  calculatePriorityDistribution(data) {
    const distribution = {
      critical: data.filter((hotspot) => hotspot.priority === 'Critical')
        .length,
      high: data.filter((hotspot) => hotspot.priority === 'High').length,
      medium: data.filter((hotspot) => hotspot.priority === 'Medium').length,
      low: data.filter((hotspot) => hotspot.priority === 'Low').length,
    };
    const total = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0
    );
    return {
      ...distribution,
      percentages: {
        critical: total > 0 ? (distribution.critical / total) * 100 : 0,
        high: total > 0 ? (distribution.high / total) * 100 : 0,
        medium: total > 0 ? (distribution.medium / total) * 100 : 0,
        low: total > 0 ? (distribution.low / total) * 100 : 0,
      },
    };
  }
  /**
   * Get top risk areas
   * @param {Array} data - Hotspots data
   * @param {number} limit - Number of top areas to return
   * @returns {Array} Top risk areas
   */
  getTopRiskAreas(data, limit = 5) {
    return data
      .sort((a, b) => b.avgSeverity - a.avgSeverity)
      .slice(0, limit)
      .map((hotspot) => ({
        area: hotspot.area,
        severity: hotspot.avgSeverity,
        temperature: hotspot.avgTemperature,
        priority: hotspot.priority,
        reportCount: hotspot.reportCount,
      }));
  }
  /**
   * Get hotspot details by ID
   * @param {string} hotspotId - Hotspot ID
   * @returns {Promise<Object>} Hotspot details
   */
  async getHotspotById(hotspotId) {
    try {
      const response = await this.getHotspotsData();
      if (!response.success) {
        return response;
      }
      const hotspot = response.data.find(
        (h) => h.id === hotspotId || h.clusterId === hotspotId
      );
      if (!hotspot) {
        return {
          success: false,
          error: 'Hotspot not found',
          data: null,
        };
      }
      return {
        success: true,
        data: hotspot,
        source: response.source,
      };
    } catch (error) {
      console.error('HotspotsService: Failed to get hotspot by ID:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }
  /**
   * Get hotspots by area
   * @param {string} areaName - Area name
   * @returns {Promise<Object>} Area hotspots
   */
  async getHotspotsByArea(areaName) {
    try {
      const response = await this.getHotspotsData();
      if (!response.success) {
        return response;
      }
      const areaHotspots = response.data.filter((hotspot) =>
        hotspot.area.toLowerCase().includes(areaName.toLowerCase())
      );
      return {
        success: true,
        data: areaHotspots,
        source: response.source,
      };
    } catch (error) {
      console.error('HotspotsService: Failed to get hotspots by area:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
}
export default new HotspotsService();
