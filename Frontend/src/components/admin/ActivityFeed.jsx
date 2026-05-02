import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Flame,
  Bell,
  FileText,
  Activity,
  Shield,
  MapPin,
} from 'lucide-react';
const ActivityFeed = ({ maxItems = 50 }) => {
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: 'hotspot',
      message: 'Critical hotspot detected',
      location: 'Korangi Industrial Area',
      time: '2 min ago',
      severity: 'critical',
    },
    {
      id: 2,
      type: 'report',
      message: 'Report RPT-2026-1547 approved',
      location: 'by Admin',
      time: '5 min ago',
      severity: 'success',
    },
    {
      id: 3,
      type: 'user',
      message: 'User Farhan Ali flagged',
      location: 'Multiple inaccurate reports',
      time: '12 min ago',
      severity: 'warning',
    },
    {
      id: 4,
      type: 'alert',
      message: 'Alert broadcasted',
      location: 'Heat advisory for Saddar',
      time: '18 min ago',
      severity: 'info',
    },
    {
      id: 5,
      type: 'report',
      message: 'Report RPT-2026-1546 validated',
      location: 'by System',
      time: '25 min ago',
      severity: 'success',
    },
    {
      id: 6,
      type: 'hotspot',
      message: 'High temperature threshold exceeded',
      location: 'in Gulshan',
      time: '35 min ago',
      severity: 'warning',
    },
    {
      id: 7,
      type: 'report',
      message: 'Report RPT-2026-1545 rejected',
      location: 'Duplicate submission',
      time: '45 min ago',
      severity: 'error',
    },
  ]);
  const scrollRef = useRef(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newActivity = generateRandomActivity();
      setActivities((prev) => {
        const updated = [newActivity, ...prev].slice(0, maxItems);
        return updated;
      });
    }, 30000); // Add new activity every 30 seconds
    return () => clearInterval(interval);
  }, [maxItems]);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activities, isAutoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      setIsAutoScroll(scrollRef.current.scrollTop < 10);
    }
  };
  const generateRandomActivity = () => {
    const types = [
      {
        type: 'hotspot',
        message: 'New heat anomaly detected',
        locations: ['DHA Phase 8', 'Clifton Block 2', 'Saddar'],
      },
      {
        type: 'report',
        message: 'New report submitted',
        locations: ['User #2841', 'User #1956', 'User #3421'],
      },
      {
        type: 'alert',
        message: 'Temperature threshold alert',
        locations: ['Korangi', 'Landhi', 'Shah Faisal'],
      },
      {
        type: 'user',
        message: 'User registration',
        locations: ['New user joined', 'Account verified'],
      },
    ];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomLocation =
      randomType.locations[
        Math.floor(Math.random() * randomType.locations.length)
      ];
    return {
      id: Date.now(),
      type: randomType.type,
      message: randomType.message,
      location: randomLocation,
      time: 'Just now',
      severity:
        Math.random() > 0.7
          ? 'critical'
          : Math.random() > 0.5
            ? 'warning'
            : 'success',
    };
  };
  const getActivityIcon = (type, severity) => {
    const iconProps = { className: 'w-4 h-4' };
    switch (type) {
      case 'hotspot':
        return (
          <Flame
            {...iconProps}
            className={`w-4 h-4 ${severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`}
          />
        );
      case 'report':
        return (
          <FileText
            {...iconProps}
            className={`w-4 h-4 ${severity === 'success' ? 'text-emerald-600' : severity === 'error' ? 'text-red-600' : 'text-green-600'}`}
          />
        );
      case 'user':
        return (
          <User
            {...iconProps}
            className={`w-4 h-4 ${severity === 'warning' ? 'text-amber-600' : 'text-green-600'}`}
          />
        );
      case 'alert':
        return <Bell {...iconProps} className="w-4 h-4 text-orange-600" />;
      case 'system':
        return <Shield {...iconProps} className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity {...iconProps} className="w-4 h-4 text-slate-400" />;
    }
  };
  const getActivityColors = (severity) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-amber-500 bg-amber-50';
      case 'success':
        return 'border-l-emerald-500 bg-emerald-50';
      default:
        return 'border-l-green-500 bg-green-50';
    }
  };
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Live
          </span>
        </div>
        <button
          onClick={() => setActivities([])}
          className="text-xs text-slate-400 font-medium hover:text-slate-600 transition-colors"
        >
          Clear all
        </button>
      </div>
      {/* Activity List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2 pr-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 transition-colors scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`
flex items-start gap-3 p-3 rounded-r-xl border-l-2 transition-all duration-300 hover:translate-x-1
${getActivityColors(activity.severity)}`}
          >
            <div className="mt-0.5 shrink-0">
              {getActivityIcon(activity.type, activity.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 font-bold truncate">
                {activity.message}
              </p>
              <p className="text-xs text-slate-500 font-medium truncate">
                {activity.location}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ActivityFeed;
