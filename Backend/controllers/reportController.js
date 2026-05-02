import Report from '../models/Report.js';

// Mock data storage for when DB is unavailable
let mockReports = [
  {
    _id: 'RPT-2401',
    areaName: 'Saddar',
    location: { lat: 24.8528, lng: 67.0296 },
    severity: 5,
    timestamp: new Date('2026-04-25T07:40:00+05:00'),
    description:
      'Roadside pavement is radiating intense heat and pedestrians are sheltering under shop shutters.',
    source: 'Citizen',
    category: 'Built-up canyon',
    status: 'pending',
    userName: 'Ahmed Khan',
    userEmail: 'ahmed@example.com',
    userRole: 'USER',
    temperature: 42.3,
  },
];

export const getReports = async (req, res) => {
  try {
    let reports;
    try {
      reports = await Report.find().sort({ timestamp: -1 });
    } catch (dbError) {
      console.log('DB unavailable, using mock reports');
      reports = mockReports;
    }

    res.json({
      message: 'Reports retrieved successfully',
      reports,
      total: reports.length,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to fetch reports', message: error.message });
  }
};

export const submitReport = async (req, res) => {
  try {
    let data = req.body;

    // If sent as FormData with reportData field
    if (req.body.reportData) {
      try {
        data = JSON.parse(req.body.reportData);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid reportData format' });
      }
    }

    const { location, severity, description, areaName, temperature, category } =
      data;
    const user = req.user;

    const reportData = {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      location,
      areaName,
      severity,
      temperature,
      description,
      category,
      source: 'Citizen',
      status: 'pending',
      image: req.file ? `/uploads/${req.file.filename}` : null,
      timestamp: new Date(),
    };

    try {
      const newReport = new Report(reportData);
      await newReport.save();
      res
        .status(201)
        .json({ message: 'Report submitted successfully', report: newReport });
    } catch (dbError) {
      console.log('DB unavailable, using mock storage');
      const mockReport = { ...reportData, _id: `RPT-${Date.now()}` };
      mockReports.unshift(mockReport);
      res
        .status(201)
        .json({
          message: 'Report submitted successfully (Mock Mode)',
          report: mockReport,
        });
    }
  } catch (error) {
    console.error('Submit error:', error);
    res
      .status(500)
      .json({ error: 'Failed to submit report', message: error.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user._id;
    let reports;
    try {
      reports = await Report.find({ userId }).sort({ timestamp: -1 });
    } catch (dbError) {
      reports = mockReports.filter(
        (r) => r.userId === userId || r.userEmail === req.user.email
      );
    }
    res.json({ reports, user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your reports' });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const report = await Report.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json({ message: 'Report status updated', report });
    } catch (dbError) {
      const index = mockReports.findIndex((r) => r._id === id || r.id === id);
      if (index === -1)
        return res.status(404).json({ error: 'Report not found' });
      mockReports[index].status = status;
      res.json({
        message: 'Report status updated (Mock Mode)',
        report: mockReports[index],
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report status' });
  }
};
