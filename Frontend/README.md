# ThermaX Frontend

Modern React-based frontend for the ThermaX urban heat mapping platform.

## 🚀 Features

### 🎨 Professional UI/UX
- **Modern SaaS Dashboard**: Vertical layout with sticky top Navbar, main content area, and sliding context panel
- **Responsive Design**: Mobile-first approach with desktop enhancements
- **Dark/Light Themes**: Complete theme system with smooth transitions
- **Interactive Components**: Micro-interactions, hover effects, and smooth animations
- **Accessibility**: ARIA labels, keyboard navigation, and semantic HTML

### 🗺️ Advanced Mapping
- **Interactive Leaflet Maps**: Real-time heat mapping with severity-based visualization
- **Multi-layer Controls**: Toggle between heat, satellite, clusters, and hotspots
- **Marker Clustering**: Intelligent grouping of nearby reports
- **DBSCAN Hotspot Detection**: Color-coded risk zones with analytics
- **Click Analytics**: Detailed location analysis with insights
- **Fullscreen Mode**: Professional browser-compatible fullscreen toggle

### 📊 State Management
- **Zustand Global State**: Production-ready state management for map interactions
- **Real-time Data Polling**: 30-second interval updates with error resilience
- **Context Panel**: Dynamic location data display with safe fallbacks
- **Modal System**: Detailed analysis views with charts and insights

### 🔐 Authentication Integration
- **JWT-based Auth**: Secure token management with automatic refresh
- **Role-based UI**: Dynamic navigation and permissions based on user roles
- **Protected Routes**: Route guards with automatic redirects
- **Session Management**: Persistent authentication with localStorage

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | Core frontend framework |
| **Vite** | 7.3 | Build tool and development server |
| **React Router** | 6.16 | Client-side routing and navigation |
| **Tailwind CSS** | 4.1 | Utility-first CSS framework |
| **Zustand** | 5.0 | Global state management |
| **Leaflet** | 1.9.4 | Interactive mapping library |
| **React-Leaflet** | 4.2.1 | React components for Leaflet |
| **Leaflet.heat** | 0.2.0 | Heatmap plugin for Leaflet |
| **Leaflet.markercluster** | 1.5.3 | Marker clustering plugin |
| **Lucide React** | 1.11.0 | Modern icon library |
| **Recharts** | 3.3 | Data visualization and charts |
| **Axios** | 1.13 | HTTP client for API communication |
| **React Hot Toast** | 2.6 | Toast notifications |
| **clsx** | 2.1 | Utility for constructing className strings |
| **tailwind-merge** | 3.5 | Merge Tailwind CSS classes |
| **density-clustering** | 1.3 | DBSCAN clustering algorithm |

## 📦 Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.16.0",
  "zustand": "^5.0.12",
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "leaflet.heat": "^0.2.0",
  "leaflet.markercluster": "^1.5.3",
  "lucide-react": "^1.11.0",
  "recharts": "^3.3.0",
  "axios": "^1.13.2",
  "react-hot-toast": "^2.6.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.5.0",
  "density-clustering": "^1.3.0"
}
```

### Development Dependencies
```json
{
  "vite": "^7.3.1",
  "@vitejs/plugin-react": "^5.1.4",
  "@vitejs/plugin-react-swc": "^4.2.2",
  "tailwindcss": "^4.1.18",
  "@tailwindcss/postcss": "^4.1.18",
  "autoprefixer": "^10.4.24",
  "postcss": "^8.5.6",
  "eslint": "^9.39.1",
  "@eslint/js": "^9.39.1",
  "eslint-plugin-react-hooks": "^5.2.0",
  "eslint-plugin-react-refresh": "^0.4.24",
  "stylelint": "^17.3.0",
  "stylelint-config-standard": "^40.0.0",
  "stylelint-config-tailwindcss": "^1.0.1",
  "globals": "^16.5.0"
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ThermaX/Frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open browser**
Navigate to `http://localhost:5173`

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Run ESLint with auto-fix
npm run lint:fix
```

## 🏗️ Project Structure

```
Frontend/
├── public/                 # Static assets
├── src/
│   ├── Components/         # Reusable UI components
│   │   ├── admin/         # Admin panel components
│   │   ├── auth/          # Authentication components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── layout/        # Layout components (Navbar, AppLayout, DashboardLayout)
│   │   └── ui/            # Base UI components
│   ├── Pages/             # Route-based page components
│   │   ├── Admin/         # Admin pages
│   │   ├── Auth/          # Authentication pages
│   │   ├── Dashboard/     # Dashboard page
|   |   |- HeatReport/    # Heat reporting pages, including the local MiniMap
│   │   ├── Insight/       # Analytics insight pages
│   │   ├── Landing/       # Landing page
│   │   ├── Permission/    # Geolocation permission pages
│   │   ├── Profile/       # User profile and statistics
│   │   ├── Reports/       # Reports pages
│   │   └── Settings/      # User settings view
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   │   ├── api/           # API hooks (useApiResource)
│   │   ├── data/          # Data fetching hooks
│   │   │   ├── useHeatmap.js
│   │   │   ├── useHeatmapData.js
│   │   │   ├── useHotspots.js
│   │   │   ├── useRealTimeData.js
│   │   │   └── useReports.js
│   │   ├── ui/            # UI hooks (useFullscreen)
│   │   └── useSelectedLocation.js  # Zustand global state
│   ├── services/          # API and data services
│   │   ├── api.js         # Centralized Axios instance
│   │   ├── config.js      # API configuration
│   │   ├── heatmapService.js
│   │   ├── hotspotsService.js
│   │   ├── localStorageService.js
│   │   └── seedData.js    # Mock data generation
│   ├── utils/             # Utility functions
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # App entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS config
├── eslint.config.js       # ESLint configuration
├── .stylelintrc.json      # Stylelint configuration
└── README.md              # This file
```

## 🔧 Configuration

### Vite Configuration
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // Custom color palette
        }
      }
    },
  },
  plugins: [],
}
```

## 🎯 Key Components

### InteractiveMap
Main mapping component with:
- Multiple layer support (heatmap, clusters, hotspots)
- Click event handling for location selection
- Fullscreen toggle functionality
- Loading states and error boundaries

### ContextPanel
Right-side panel for displaying:
- Selected location details
- Risk assessment metrics
- Severity breakdowns
- Trend indicators
- Action buttons for detailed analysis

### DashboardLayout
Main layout component featuring:
- **Responsive Vertical Layout** with sticky top navigation
- **SaaS Navbar** with user dropdown and mobile slide-out menu
- **Integrated Context Panel** for detailed map analytics
- **Mobile-Responsive Behavior** handling overflow gracefully

### MiniMap
Heat report-only location preview component featuring:
- Red pin marker for the user-selected coordinates
- Auto-centering on typed or detected latitude/longitude
- Local ownership inside `Pages/HeatReport/MiniMap.jsx`

## 🔄 State Management

### Zustand Store Structure
```javascript
// hooks/useSelectedLocation.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useSelectedLocation = create(
  devtools((set, get) => ({
    selectedLocation: null,
    isPanelOpen: true,
    isModalOpen: false,
    showTooltip: false,
    tooltipPosition: { x: 0, y: 0 },
    historicalData: [],
    aiInsights: null,
    
    // Actions
    selectLocation: (location) => set({ selectedLocation: location }),
    clearLocation: () => set({ selectedLocation: null }),
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    openModal: () => set({ isModalOpen: true }),
    closeModal: () => set({ isModalOpen: false }),
  }))
)
```

### Usage Example
```javascript
import useSelectedLocation from '../hooks/useSelectedLocation';

function MyComponent() {
  const selectedLocation = useSelectedLocation((state) => state.selectedLocation);
  const selectLocation = useSelectedLocation((state) => state.selectLocation);
  
  return (
    <div>
      {selectedLocation ? (
        <div>Selected: {selectedLocation.name}</div>
      ) : (
        <div>No location selected</div>
      )}
    </div>
  );
}
```

## 🗺️ Map Integration

### Leaflet Setup
```javascript
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/images/marker-icon-2x.png',
  iconUrl: 'leaflet/images/marker-icon.png',
  shadowUrl: 'leaflet/images/marker-shadow.png',
});
```

### Layer Management
```javascript
// Heatmap layer
const heatData = data.map(point => [
  point.lat, 
  point.lng, 
  point.severity
]);

// Cluster layer
const markers = data.map(point => (
  <Marker 
    key={point.id} 
    position={[point.lat, point.lng]}
    eventHandlers={{
      click: () => selectLocation(point)
    }}
  />
));
```

## 🎨 Theming

### CSS Variables
```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}

.dark {
  --color-primary: #60a5fa;
  --color-secondary: #94a3b8;
  /* ... */
}
```

### Theme Toggle
```javascript
const [theme, setTheme] = useState('light');

const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  document.documentElement.classList.toggle('dark');
};
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Optimizations
- Touch-friendly interface elements
- Collapsible navigation
- Optimized map controls
- Reduced data usage

## 📝 Changelog

### May 2026
- **Zustand 5.0**: Updated to latest version with improved performance
- **Enhanced Hooks Structure**: Organized hooks into api/, data/, and ui/ subdirectories
- **Additional Services**: Added localStorageService and seedData for better data management
- **Heat Report Mini Map**: Moved the preview map into `Pages/HeatReport/MiniMap.jsx` and removed the old shared `components/map` folder
- **Alert History Cards**: Moved recent alert validation badges into a dedicated outer row to prevent overlap with long titles on smaller screens
- **Shared Status Badges**: Added nowrap behavior for more reliable admin badge rendering
- **Admin Stability Fixes**: Restored missing `Flame` icon imports in `AdminDashboard.jsx` and `HeatmapControl.jsx`
- **Tailwind Cleanup**: Replaced `break-words` with the canonical `wrap-break-word` utility
- **Authentication Enhancements**: Standardized Auth UI to align with the green-themed design system and integrated Google and Microsoft branding for social login
- **Admin UI Refactor**: Transitioned admin dashboard to a cohesive light theme, standardized typography, and added auto-scrolling activity feeds
- **Map Interface Standardization**: Refined `MapSection` with clean mode configuration, standardized cross-page sizing, and improved marker/legend aesthetics
- **Layout Optimizations**: Fixed SaaS dashboard map overlap and refined Profile page spacing

### April 2026
- **Tailwind CSS v4 Migration**: Updated gradient classes (`bg-gradient-to-*` → `bg-linear-to-*`)
- **CSS Optimization**: Converted arbitrary values to standard spacing scale
  - `z-[100]` → `z-100`, `w-[280px]` → `w-70`, `h-[500px]` → `h-125`
  - `min-h-[500px]` → `min-h-125`, `max-w-[200px]` → `max-w-50`
- **Component Fixes**: Resolved class conflicts in `Navbar.jsx` and `SaaS.jsx`
- **New Features**: Added Profile page and Settings view in Dashboard
- **Build Improvements**: Cleaner CSS output with standardized utility classes

---

## 🐛 Troubleshooting

### Common Issues

**Map not rendering:**
- Ensure Leaflet CSS is imported
- Check container has explicit height
- Verify map is not inside hidden element

**State not updating:**
- Check Zustand store usage
- Verify selector functions
- Ensure component re-renders

**Build errors:**
- Check all dependencies are installed
- Verify import paths are correct
- Run `npm run lint` to check for syntax errors

### Development Tips

1. **Use React DevTools** for component debugging
2. **Check Network tab** for API requests
3. **Use Console** for state management debugging
4. **Test responsive design** with device simulation

## 🚀 Performance Optimization

### Code Splitting
```javascript
const LazyComponent = lazy(() => import('./LazyComponent'));

<Suspense fallback={<div>Loading...</div>}>
  <LazyComponent />
</Suspense>
```

### Memoization
```javascript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);
```

## 📄 API Integration

### Service Layer
```javascript
// services/api.js
const api = {
  get: async (endpoint) => {
    const response = await fetch(`/api/${endpoint}`);
    return response.json();
  },
  post: async (endpoint, data) => {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
```

### Error Handling
```javascript
const fetchData = async () => {
  try {
    const data = await api.get('heatmap');
    setData(data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

## 📦 Build & Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Static Hosting**: Vercel, Netlify, GitHub Pages
- **CDN**: AWS CloudFront, Cloudflare
- **Server**: Nginx, Apache

### Environment Variables
```bash
VITE_API_URL=http://localhost:5000
VITE_MAP_API_KEY=your-map-api-key
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] All pages load without errors
- [ ] Navigation works correctly
- [ ] Map interactions function properly
- [ ] Authentication flow works
- [ ] Responsive design on mobile/tablet
- [ ] Dark/light theme toggle
- [ ] Error states display correctly

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📚 Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Community
- [React Community](https://react.dev/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react)
- [GitHub Discussions](https://github.com/facebook/react/discussions)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow React best practices
- Write meaningful comments
- Keep components small and focused

## 📄 License

MIT License - see LICENSE file for details.
