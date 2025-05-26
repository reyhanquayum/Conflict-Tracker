# Project Plan: Conflict Tracker

## Phase 1.A: Frontend Foundation & Initial Data Setup

*   **Task 1.A.1: Initialize Project (Frontend)**
    *   Set up a new React project using Vite: `npm create vite@latest . -- --template react-ts` (in the project root).
*   **Task 1.A.2: Install Core Frontend Dependencies**
    *   **React & 3D Globe Library:** `npm install three react-globe.gl rc-slider`
    *   **Data Visualization (2D):** `npm install d3`
    *   **Styling:** `npm install -D tailwindcss postcss autoprefixer`
    *   **Type Definitions:** `npm install -D @types/d3 @types/rc-slider` (if available for rc-slider).
*   **Task 1.A.3: Configure TailwindCSS**
    *   Initialize Tailwind: `npx tailwindcss init -p` (or direct binary path).
    *   Configure `tailwind.config.js` (content paths) and `src/index.css` (Tailwind directives).
*   **Task 1.A.4: Establish Frontend Project Structure**
    *   Create initial folders:
        *   `src/components/` (ui, visualization, charts)
        *   `src/hooks/`
        *   `src/utils/`
        *   `src/types/`
        *   `public/data/geodata/` (for GeoJSON country boundary data)
        *   `scripts/` (for Python ETL script)
        *   `/server` (for backend code - see Phase 1.B)
*   **Task 1.A.5 (Original Task 1.5 - Now part of Phase 1.B): Data ETL Pipeline (Python Script) to MongoDB**
    *   This task is superseded by Task 1.B.3. The script `scripts/process_data.py` will be modified to load data into MongoDB Atlas instead of generating local JSON files for events/groups.

---

## Phase 1.B: Backend Development & MongoDB Atlas Setup (NEW PHASE)

*   **Task 1.B.1: Setup MongoDB Atlas**
    *   Create a new project and cluster on MongoDB Atlas (free tier).
    *   Configure database user(s) and IP whitelisting.
    *   Obtain the MongoDB connection string.
*   **Task 1.B.2: Backend Project Setup (Node.js/Express.js)**
    *   Create a `/server` directory at the project root.
    *   Initialize Node.js project: `cd server && npm init -y`.
    *   Install dependencies: `npm install express mongodb cors dotenv`.
    *   Set up basic project structure (e.g., `server.js`, `/routes`).
*   **Task 1.B.3: Modify ETL Script to Populate MongoDB Atlas**
    *   Update `scripts/process_data.py`:
        *   Add `pymongo` and `dnspython` to Python dependencies.
        *   Connect to MongoDB Atlas using the connection string (via environment variable).
        *   Insert processed ACLED CSV data into an `events` collection.
        *   Insert/derive group data into a `groups` collection.
        *   Define and create indexes (e.g., `events`: on `year`, `date`; `groups`: on `name`).
    *   Run this script once to populate the database.
*   **Task 1.B.4: Develop Backend API Endpoints (Node.js/Express.js)**
    *   In the `/server` project:
    *   **Event Data Endpoint:** `GET /api/events`
        *   Accept query params: `startYear` (number), `endYear` (number), `limit` (number, e.g., default 2000).
        *   Query MongoDB `events` collection.
        *   Return JSON results.
    *   **Configuration Endpoint:** `GET /api/config/datarange`
        *   Query `events` collection for min/max year.
        *   Return `{ minYear, maxYear }` as JSON.
    *   **(Optional) Group Data Endpoint:** `GET /api/groups` or `GET /api/groups/:groupName`.
*   **Task 1.B.5: Implement CORS and Environment Variables for Backend**
    *   Configure `cors` middleware in Express.
    *   Use a `.env` file (in `/server`, add to `.gitignore`) for `MONGO_URI`, `PORT`, etc.

---

## Phase 2: Core 3D Globe Visualization (Frontend)

*   **Task 2.1: `GlobeDisplay` Component**
    *   Create/Refine `src/components/visualization/GlobeDisplay.tsx` to host and configure `react-globe.gl`.
*   **Task 2.2: Implement 3D Political Globe with `react-globe.gl`**
    *   Source GeoJSON for world countries (e.g., Natural Earth) and place in `public/data/geodata/countries.geojson`.
    *   `GlobeDisplay` fetches this static GeoJSON.
    *   Configure `react-globe.gl` for country polygons, styling (minimalist dark-mode), and basic interactions.
*   **Task 2.3: Geospatial Data for Event Markers (via API)**
    *   `App.tsx` will fetch event data from `/api/events` based on `TimelineSlider` range.
    *   This fetched (and already filtered by backend) data will be passed to `GlobeDisplay`.
*   **Task 2.4: Render Event Markers (Spikes/Pins) on `react-globe.gl`**
    *   `GlobeDisplay` uses the `events` prop (from `App.tsx`) for `react-globe.gl`'s `pointsData` (or `objectsData` for custom meshes).
    *   Style these markers.

---

## Phase 3: UI Components & Interactivity (Frontend)

*   **Task 3.0: Setup shadcn/ui (NEW TASK)**
    *   Run `npx shadcn-ui@latest init` in the project root.
    *   Configure options (style, color, paths for `globals.css` / `index.css`, `tailwind.config.js`, import aliases `@/components`, `@/lib/utils`, React Server Components: No).
    *   This will update/create necessary configuration files and `src/lib/utils.ts`.
    *   Install peer dependencies like `lucide-react` if prompted.
*   **Task 3.1: `TimelineSlider` Component**
    *   Implement `src/components/ui/TimelineSlider.tsx` using `rc-slider` (current implementation).
    *   (Optional: Revisit styling of `rc-slider` later to better match shadcn/ui theme if needed, or replace with a shadcn/ui compatible slider if one exists or is built).
    *   `App.tsx` fetches initial min/max year range from `/api/config/datarange`.
    *   Slider controls `startYear` and `endYear` parameters for API calls to `/api/events`.
*   **Task 3.2: Interactive Event Modals/Tooltips (using shadcn/ui)**
    *   Add shadcn/ui `Dialog` and/or `Tooltip` components: `npx shadcn-ui@latest add dialog tooltip`.
    *   Enhance `GlobeDisplay`'s event marker interaction (e.g., `onPointClick` from `react-globe.gl`).
    *   On click, display a `Dialog` (modal) with event details. Use `Tooltip` for hover info if desired.
*   **Task 3.3: `DashboardPanel` Component (using shadcn/ui)**
    *   Create `src/components/ui/DashboardPanel.tsx`.
    *   Use shadcn/ui components like `Card`, `Table` (if added: `npx shadcn-ui@latest add card table`) for layout and display of summary statistics.
    *   Statistics might require new API endpoints if aggregations are done server-side.

---

## Phase 4: 2D Data Visualizations (D3.js) (Frontend)

*   **Task 4.1: D3 Integration Setup**
    *   Wrapper components in React for D3 charts.
*   **Task 4.2: `BarChart` Component**
    *   Data for chart derived from event data fetched by `App.tsx` (or a dedicated API endpoint for aggregated chart data).
*   **Task 4.3: `PieChart` Component**
    *   Similar data sourcing as BarChart.

---

## Phase 5: Styling, Refinements & Fallback (Frontend)

*   (Tasks remain largely the same: Comprehensive Styling, Responsive Layout, WebGL Fallback)

---

## Phase 6: Deployment

*   **Task 6.1: Build Configuration (Frontend)**
    *   Vite build process for static output.
*   **Task 6.2: Backend Deployment**
    *   Deploy the Node.js/Express.js API server (e.g., to Vercel Serverless Functions, Netlify Functions, Heroku, Render, etc.).
    *   Configure environment variables (MongoDB URI) on the deployment platform.
*   **Task 6.3: Frontend Deployment**
    *   Deploy static frontend (e.g., Vercel, Netlify).
    *   Ensure frontend API calls point to the deployed backend URL.

---

## Optional Enhancements (Time Permitting)

*   (Tasks remain the same)

---
(Old "Next Steps & Questions" section removed as it's outdated)
