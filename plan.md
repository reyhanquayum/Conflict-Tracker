# Project Plan: Conflict Tracker

## Phase 1: Project Foundation & Data Preparation

*   **Task 1.1: Initialize Project**
    *   Set up a new React project using Vite: `npm create vite@latest conflict-tracker -- --template react-ts` (or `yarn create vite conflict-tracker --template react-ts`).
    *   Navigate into the project directory.
*   **Task 1.2: Install Core Dependencies**
    *   **React & 3D Globe Library:** `npm install three react-globe.gl` (react-globe.gl uses Three.js; @react-three/fiber and @react-three/drei might be used for custom markers if not fully handled by react-globe.gl, or can be added later if needed for other 3D elements).
    *   **Data Visualization (2D):** `npm install d3`
    *   **Styling:** `npm install -D tailwindcss postcss autoprefixer`
    *   **Type Definitions (for D3 if using TS):** `npm install -D @types/d3`
    *   *(Note: @types/react-globe.gl might be needed if available and using TypeScript extensively with it).*
*   **Task 1.3: Configure TailwindCSS**
    *   Initialize Tailwind: `npx tailwindcss init -p`
    *   Configure `tailwind.config.js` (content paths) and `index.css` (Tailwind directives).
*   **Task 1.4: Establish Project Structure**
    *   Create initial folders:
        *   `src/components/` (for UI, 3D, and chart components)
        *   `src/hooks/` (for custom React hooks)
        *   `src/utils/` (for helper functions, e.g., geo-coordinate conversion)
        *   `src/types/` (for TypeScript type definitions)
        *   `public/data/` (for `events.json`, `groups.json`)
        *   `public/data/geodata/` (for GeoJSON country boundary data)
        *   `scripts/` (for the Python ETL script at the root level)
*   **Task 1.5: Data ETL Pipeline (Python Script)**
    *   *(This can be developed in parallel. We'll need the ACLED CSV data source for this.)*
    *   Create a Python script (`scripts/process_data.py`).
    *   **Dependencies:** `pandas`, and optionally `textblob` or `spacy` if NLP is pursued.
    *   **Steps:**
        1.  Load data from the ACLED CSV file.
        2.  Clean data: Handle missing values, filter relevant columns (date, latitude, longitude, actor1, event_type, notes/summary).
        3.  Transform data:
            *   Standardize group names.
            *   Format dates.
        4.  (Optional NLP): If using TextBlob/spaCy, extract key terms from event descriptions.
        5.  Generate `events.json`: Array of event objects (e.g., `{ id, lat, lon, group, date, type, description, keywords? }`).
        6.  Generate `groups.json`: Array of group objects (e.g., `{ name, summary, ideology? }`). This might be partially derived from events or require separate input.
    *   Place output JSON files into `public/data/`.

---

## Phase 2: Core 3D Globe Visualization

*   **Task 2.1: `GlobeDisplay` Component (formerly `GlobeCanvas`)**
    *   Create a main React component (`src/components/visualization/GlobeDisplay.tsx`) to host and configure the `react-globe.gl` component.
*   **Task 2.2: Implement 3D Political Globe with `react-globe.gl`**
    *   Source GeoJSON data for world country boundaries (e.g., from Natural Earth Data) and place it in `public/data/geodata/`.
    *   Load the GeoJSON data in the `GlobeDisplay` component.
    *   Configure `react-globe.gl` to render country polygons using the GeoJSON.
    *   Style the globe, polygons (land/ocean), borders, and labels (if supported directly for countries) to achieve the "minimalist dark-mode style."
    *   Enable basic interactions like hover/click tooltips for countries if provided by `react-globe.gl`.
*   **Task 2.3: Geospatial Data for Event Markers**
    *   Ensure `events.json` (from Task 1.5) contains accurate latitude/longitude for events.
    *   If needed, create utility functions to prepare event data for `react-globe.gl`'s custom object/layer system.
*   **Task 2.4: Render Event Markers (Spikes/Pins) on `react-globe.gl`**
    *   Load `events.json` data.
    *   Use `react-globe.gl`'s capabilities to render custom objects (our spikes/pins) at event locations. This might involve its `objectsData` prop or a similar mechanism.
    *   Style these markers.
    *   (Task 2.5 Camera Controls is removed as `react-globe.gl` handles its own camera/interaction model).

---

## Phase 3: UI Components & Interactivity

*   **Task 3.1: `TimelineSlider` Component**
    *   Create `src/components/ui/TimelineSlider.tsx`.
    *   Use a simple HTML range input or a library for a more advanced slider.
    *   Manage selected year range state (e.g., using `useState`).
    *   Pass filter state up to a parent component to control which events are rendered/highlighted on the globe.
*   **Task 3.2: Interactive Event Modals/Tooltips**
    *   Enhance `EventMarker` to be clickable.
    *   On click, display a modal or tooltip (could be HTML-based overlay or R3F's `<Html>` component from Drei).
    *   Modal content: Event details (date, type, group) from `events.json` and relevant summary from `groups.json`.
*   **Task 3.3: `DashboardPanel` Component**
    *   Create `src/components/ui/DashboardPanel.tsx`.
    *   Display summary statistics:
        *   Total number of events (dynamic based on timeline filter).
        *   Number of active groups.
        *   Other relevant aggregated data.

---

## Phase 4: 2D Data Visualizations (D3.js)

*   **Task 4.1: D3 Integration Setup**
    *   Create wrapper components in React to host D3 charts. D3 will manipulate DOM elements within these wrappers.
*   **Task 4.2: `BarChart` Component**
    *   Create `src/components/charts/BarChart.tsx`.
    *   Use D3.js to render a bar chart showing attack count by year or by group.
    *   Data for the chart should be derived from `events.json` and be reactive to the timeline filter.
*   **Task 4.3: `PieChart` Component**
    *   Create `src/components/charts/PieChart.tsx`.
    *   Use D3.js to render a pie chart showing the proportion of activity by different groups.
    *   Data should also be reactive to filters.

---

## Phase 5: Styling, Refinements & Fallback

*   **Task 5.1: Comprehensive Styling**
    *   Apply TailwindCSS classes across all components for a cohesive look and feel.
    *   Ensure the "minimalist dark-mode style" is consistent.
*   **Task 5.2: Responsive Layout**
    *   Focus on a desktop-first experience, but ensure basic responsiveness for other screen sizes.
*   **Task 5.3: WebGL Fallback**
    *   Implement a check for WebGL support (e.g., using a utility function).
    *   If WebGL is not supported, display a user-friendly message or a simple static 2D map (placeholder for now).

---

## Phase 6: Deployment

*   **Task 6.1: Build Configuration**
    *   Ensure Vite build process is correctly configured for static output (`npm run build`).
*   **Task 6.2: Deploy to Static Host**
    *   Choose Vercel or Netlify.
    *   Connect repository and configure deployment settings.

---

## Optional Enhancements (If Time Permits)

*   **3D particle animations** for event magnitude.
*   **Search bar** to filter by group name or keyword.
*   **Color-encoded markers** by group or ideology.
*   Integrate **Observable** or **Flourish.js** (this would be an alternative to custom D3 charts).

---

**Next Steps & Questions (from previous discussion):**
(These questions were resolved, plan updated based on using `react-globe.gl`)
