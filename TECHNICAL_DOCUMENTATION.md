# MENA Interactive Geospatial Conflict Tracker - Technical Documentation

**Author:** Cline (AI Software Engineer)
**Date:** May 27, 2025
**Project Duration (Simulated):** Approx. 2 days (May 26 - May 27, 2025)

## 1. Project Overview

*   **Project Name:** MENA Interactive Geospatial Conflict Tracker
*   **Objective:** To develop an interactive 3D data visualization application that displays extremist activity and conflict events on a global map, with a primary focus on the Middle East and North Africa (MENA) region. The application allows users to explore event data across different years, view aggregated statistics, and examine details of specific event clusters.
*   **Core Technologies:** React (with Vite and TypeScript) for the frontend, `react-globe.gl` (leveraging Three.js/React Three Fiber) for the 3D globe, D3.js for 2D charts, TailwindCSS for styling, Node.js with Express.js for the backend API, and MongoDB for data storage.

## 2. System Architecture

The application follows a client-server architecture:

*   **Frontend (Client-Side):**
    *   Built with **React.js** (using Vite for a fast development environment) and **TypeScript** for type safety.
    *   **`react-globe.gl`**: The core component for rendering the interactive 3D globe, country polygons, and custom 3D objects (event cluster spikes).
    *   **D3.js**: Used for data processing (rollups for charts) and rendering the bar and pie charts in the dashboard.
    *   **TailwindCSS**: For styling the UI components, ensuring a consistent dark theme.
    *   State Management: Primarily React's built-in state (`useState`, `useEffect`, `useCallback`, `useRef`).
    *   UI Components: Includes custom components for the timeline slider (`rc-slider`), dashboard panel, event detail panel, and info modal (`shadcn/ui Dialog`).

*   **Backend (Server-Side):**
    *   Built with **Node.js** and **Express.js**.
    *   Serves as an API layer to fetch and process data from MongoDB.
    *   Endpoints provide:
        *   Event clusters for the globe view (dynamic based on zoom/pan).
        *   Detailed individual events within a specific geographic cluster.
        *   Aggregated summary data (by year, by group) for the dashboard's overview state.
        *   Configuration data (min/max year range for the timeline).

*   **Database:**
    *   **MongoDB**: Stores the processed event data. Data is queried using aggregation pipelines for clustering and summaries.

*   **Data Flow:**
    1.  **Raw Data:** ACLED (Armed Conflict Location & Event Data Project) CSV file.
    2.  **ETL (Extract, Transform, Load):** A Python script (`scripts/process_data.py`) processes the CSV, cleans data, extracts relevant features (date, location, group, type, fatalities), and loads it into a MongoDB collection. This includes converting date strings and ensuring geospatial data (`lat`, `lon`) is stored appropriately.
    3.  **API Layer:** The Node.js/Express backend queries MongoDB.
        *   For globe clusters: Performs server-side aggregation to group events into geographic cells based on current map view (zoom level, center coordinates).
        *   For cluster details: Fetches individual events within the bounds of a selected cluster.
        *   For dashboard summaries: Performs aggregations to get counts by year and by group for the selected timeline.
    4.  **Frontend Consumption:** The React frontend fetches data from these API endpoints to populate the globe, dashboard charts, and detail panels.

## 3. Key Features Implemented (Detailed)

*   **3D Globe Visualization:**
    *   **Technology:** `react-globe.gl` library, which internally uses `three-globe` (based on Three.js).
    *   **Cluster Representation:** Event clusters are visualized as 3D cones (colloquially "spikes"). These are custom Three.js objects (`THREE.Mesh` with `THREE.CylinderGeometry` where `radiusTop=0`) generated via the `objectThreeObject` prop of `react-globe.gl`.
    *   **Height Encoding:** The height of each cone is logarithmically scaled based on the number of events (`cluster.count`) it represents. This provides a visual indication of event density. `MIN_HEIGHT` and `MAX_HEIGHT` constants ensure visibility and prevent excessively tall spikes.
    *   **Interaction:**
        *   **Click:** Clicking a cone fetches detailed events for that cluster and displays them in the `EventDetailPanel`.
        *   **Hover:** Hovering over a cone highlights it (e.g., changes color to `orangered` and increases opacity) while desaturating other cones (e.g., to grey with lower opacity). This effect is debounced (75ms) to improve performance during rapid mouse movements.
    *   **Initial View & Controls:** The globe initializes with a view centered on the Indian subcontinent / east of the MENA region. It features auto-rotation which stops upon user interaction. Standard orbit controls allow zoom and pan.

*   **Data Aggregation & Clustering (Backend):**
    *   The `/api/events` endpoint uses a MongoDB aggregation pipeline to dynamically generate clusters.
    *   Events are grouped into grid cells based on their latitude and longitude, rounded to a certain precision.
    *   The `getGridPrecision(zoomLevel)` helper function on the backend adjusts this precision: lower zoom levels result in coarser grids (fewer, larger clusters), while higher zoom levels use finer grids (more, smaller clusters).
    *   The `/api/events_in_cluster` endpoint fetches raw individual event documents that fall within the geographic `bounds` of a specific cluster (passed from the client).
    *   The `/api/events/summary` endpoint provides pre-aggregated counts by year and by group for the entire dataset within the selected timeline range, used for the dashboard's overview state.

*   **Timeline Functionality:**
    *   Implemented using the `rc-slider` React component for a range slider.
    *   Allows users to select a start and end year, filtering all data displayed (globe clusters, dashboard summaries).
    *   Changing the timeline triggers new API calls to refetch cluster data and overall summary data.
    *   **UI Refinement:** The timeline container's opacity changes dynamically: it's semi-transparent by default, becomes more opaque on hover, and fully opaque when actively being dragged. This is managed via state in `App.tsx` and CSS classes.

*   **Dashboard Panel:**
    *   **Dynamic Data Display:** The dashboard charts adapt to show either an overview of the entire dataset (for the selected year range) or specific details for a selected event cluster. This is controlled by `isClusterSelected` state in `App.tsx`.
    *   **Bar Chart (Events per Year):**
        *   Rendered using D3.js.
        *   Displays the number of events for each year.
        *   Accepts two types of input data: `EventData[]` (which it then rolls up by year) or `YearlyCount[]` (pre-aggregated).
        *   X-axis labels (years) are dynamically selected and rotated to prevent overlap if there are many years.
        *   Includes "Year" and "Number of Events" axis titles.
    *   **Pie Chart (Event Proportion by Group):**
        *   Rendered using D3.js as a donut chart.
        *   Displays the proportion of events attributed to different actor groups.
        *   Accepts `EventData[]` (rolls up by group) or `GroupCount[]` (pre-aggregated).
        *   Implements a "Top N + Other" logic to group smaller slices into an "Other" category for clarity (Top 7 groups shown).
        *   Features interactive tooltips on hover over slices, showing full group name, count, and percentage. Labels for very small slices (<5%) are hidden to rely on tooltips. Long labels are truncated.
    *   **Toggleable Visibility:** A button allows users to show/hide the dashboard panel.

*   **Event Detail Panel:**
    *   Appears when a cluster spike is clicked.
    *   Lists individual events within that cluster, showing ID, date, group, type, and description.
    *   **Expandable Text:** Long event descriptions are truncated with a "Read More" link (styled as text) that expands/collapses the full description.

*   **User Experience Enhancements:**
    *   **Initial Info Modal:** A `shadcn/ui Dialog` component displays welcome information and usage instructions on first load.
    *   **"Don't show again" Feature:** The info modal includes a checkbox that, if selected, saves a preference to `localStorage` to prevent the modal from appearing on subsequent visits.
    *   **WebGL Fallback:** Checks for WebGL support on component mount. If unavailable, it displays a user-friendly message instead of attempting to render the globe.
    *   **Debouncing:**
        *   Map view changes (pan/zoom) are debounced (500ms) before triggering API calls for new cluster data, improving perceived performance during navigation.
        *   Hover effects on globe clusters are debounced (75ms) to prevent excessive re-renders during rapid mouse movement.
    *   **Data Source Acknowledgement:** The info modal includes text acknowledging ACLED as the data source and specifying the dataset scope.

## 4. Technical Challenges & Solutions

*   **Cluster Rendering & Interaction:**
    *   **Challenge 1: Initial Dynamic Data Display Strategy.**
        *   *Problem:* The initial plan to dynamically switch the globe display between clusters (zoomed out) and individual event points (zoomed in) by refetching different data types proved complex to manage in terms of state, API calls, and led to buggy behavior (e.g., data disappearing, incorrect zoom thresholds).
        *   *Solution:* Adopted an "Always Show Clusters, Drill Down to List" model. The globe always displays clusters. Clicking a cluster fetches its constituent individual events, which are then shown in a separate `EventDetailPanel`. This simplified frontend state management and API interactions for the globe significantly.
    *   **Challenge 2: Visual Clutter and Representation of Cluster Density.**
        *   *Problem:* Representing event density effectively on a 3D globe without overwhelming visual clutter from overlapping markers.
        *   *Solution Iteration:*
            1.  Started with simple point markers.
            2.  Explored heatmap-style coloring for points based on count, but overlap made colors hard to discern.
            3.  Adjusted point radii and color schemes (`d3.interpolateYlOrRd`, then `d3.interpolateInferno`).
            4.  Modified backend clustering (`getGridPrecision`) to generate fewer, larger-area clusters when zoomed out, reducing the number of distinct markers.
            5.  Implemented 3D cones ("spikes") using custom Three.js objects (`CylinderGeometry` with `radiusTop=0`) via `react-globe.gl`'s `objectThreeObject`. The height of these cones was logarithmically scaled by the event count in the cluster, providing a clear visual hierarchy.
    *   **Challenge 3: Correctly Orienting and Positioning Custom 3D Objects.**
        *   *Problem:* The custom 3D cones initially exhibited a consistent northward (or southward) offset from their true geographic coordinates, or were not "standing up" correctly.
        *   *Solution:* This required iterative debugging of local transformations (rotation and translation) applied to the `THREE.Mesh` within the `objectThreeObject` callback. The key was understanding how `react-globe.gl` handles custom objects:
            *   It places the object's local origin `(0,0,0)` at the `lat/lng/objectAltitude`.
            *   It orients the object's local Z-axis to point outwards from the sphere.
            *   The final working solution involved creating the cone with its height along its local Y-axis and its geometric center at its local origin. Then, a single rotation (`mesh.rotation.x = Math.PI / 2;`) was applied to align the cone's height (original Y) with its new local Z-axis (tip pointing to +Z). No local translation was needed, as `react-globe.gl` correctly positioned the object's center.

*   **D3 Charting in React:**
    *   **Challenge 1: Integrating D3 with React's Declarative Paradigm.**
        *   *Problem:* D3 is imperative (manipulates the DOM directly), while React is declarative.
        *   *Solution:* Used `useRef` to get references to SVG elements. All D3 rendering logic was encapsulated within `useEffect` hooks, triggered by changes in `data` or dimension props (`width`, `height`). D3 was used to manipulate the content *within* the SVG element managed by React.
    *   **Challenge 2: X-Axis Labels for Bar Chart Displaying Incorrect Formats.**
        *   *Problem:* Year labels on the x-axis were showing as "01 M", "07 S" etc., instead of "2000", "2005". This persisted despite various `tickFormat` attempts.
        *   *Solution:* Extensive debugging revealed the root cause: the data processing step (`d3.rollup`) that aggregated events by year was incorrectly parsing the year from the date strings (e.g., "31 December 2020" was yielding "31 D" instead of "2020"). Correcting the string parsing logic (`d.date.split(' ').pop()`) to extract the last part of the date string fixed the input to the D3 scale's domain. Subsequent D3 axis configuration (`tickValues` and manual text setting) then worked as expected.
    *   **Challenge 3: Pie Chart Tooltips Constrained by Parent Container.**
        *   *Problem:* Tooltips for pie chart slices were being cut off or causing their container (the dashboard panel) to scroll because they were positioned absolutely within a relatively positioned parent with `overflow-y-auto`.
        *   *Solution:* Modified the D3 logic to append the tooltip `div` directly to `document.body`. This allows the tooltip to be positioned relative to the viewport (using `event.pageX`, `event.pageY`) and float above all other page content. Ensured the tooltip `div` is managed (created if not exists, hidden/removed on component unmount or data change) within the `useEffect` hook.

*   **Performance Optimization:**
    *   **Challenge 1: Laggy Panning/Zooming on the Globe.**
        *   *Problem:* Frequent API calls for cluster data triggered on every `dragEnd` event made navigation feel sluggish.
        *   *Solution:* Implemented debouncing for the `mapView` state updates in `App.tsx` using `setTimeout` and `clearTimeout` within a `useCallback` and `useRef`. API calls are now only made after the user stops interacting for 500ms.
    *   **Challenge 2: Laggy Hover Effects Over Many Globe Clusters.**
        *   *Problem:* Rapid mouse movement across many cluster spikes triggered numerous state updates for `hoveredCluster`, leading to performance degradation.
        *   *Solution:* Debounced the `setHoveredCluster` call in `GlobeDisplay.tsx`'s `onObjectHover` handler with a short delay (75ms).

*   **Data Handling and State Management:**
    *   **Challenge 1: Consistent Data Identifiers.**
        *   *Problem:* MongoDB uses `_id`, while frontend types might expect `id`.
        *   *Solution:* Standardized on `id` for `EventData` on the frontend. The backend endpoint `/api/events_in_cluster` now projects MongoDB's `_id` to an `id` field in the returned documents.
    *   **Challenge 2: Displaying Different Data Views in Dashboard Charts.**
        *   *Problem:* The dashboard needed to show charts based on either the overall dataset (for the selected timeline) or events from a specific, selected cluster.
        *   *Solution:*
            1.  Created a new backend endpoint (`/api/events/summary`) to provide pre-aggregated data (counts by year, counts by group) for the overall view.
            2.  `App.tsx` fetches both detailed cluster event data (when a cluster is clicked) and this overall summary data.
            3.  `DashboardPanel.tsx` receives both data types and an `isClusterSelected` flag. It conditionally passes the appropriate data to `BarChart.tsx` and `PieChart.tsx`.
            4.  The chart components (`BarChart.tsx`, `PieChart.tsx`) were updated to accept a union type for their `data` prop (`EventData[] | YearlyCount[]` or `EventData[] | GroupCount[]`) and include logic to process either format.

## 5. Data Visualization Process & Decisions

*   **Initial Concept:** The goal was an interactive 3D globe to visualize conflict event data, moving beyond static maps or simple 2D charts.
*   **Data Representation - Markers:**
    *   The primary challenge was representing potentially thousands of event points without overwhelming the user or performance.
    *   **Clustering:** Server-side geographic clustering was chosen early on as essential. The granularity of clusters dynamically changes with the globe's zoom level, controlled by a `getGridPrecision` function on the backend.
    *   **Marker Evolution:**
        1.  **Simple Points:** Considered initially but wouldn't convey density well.
        2.  **Sized/Colored Points:** Attempted to use color (heatmap style) and radius to show cluster density. While functional, visual overlap of many points diminished the clarity of the heatmap effect.
        3.  **3D Cones (Spikes):** Adopted as the final representation. The height of each cone is logarithmically scaled by the event count it represents. This leverages the 3D space effectively to show density and provides better visual separation than flat, overlapping markers. The cones are interactive (clickable for details, hover effects).
*   **Dashboard Charts:**
    *   **Bar Chart (Events per Year):** A standard choice for showing trends over time.
    *   **Pie Chart (Event Proportion by Group):** Useful for understanding the relative involvement of different actors. Implemented as a donut chart for aesthetic reasons and to accommodate labels better. The "Top N + Other" aggregation for the pie chart helps keep it readable when many groups are present.
    *   **D3.js:** Selected for its power and flexibility in creating custom charts, despite the integration overhead with React.
*   **Interactivity Focus:**
    *   **Timeline Filtering:** Essential for exploring temporal patterns.
    *   **Globe Navigation:** Standard zoom and pan are key for geospatial exploration.
    *   **Click-to-Detail:** Allows users to drill down from aggregated cluster views to individual event lists.
    *   **Hover Feedback:** Provides immediate visual cues for interactive elements (globe spikes, pie chart slices).
*   **User Experience (UX):**
    *   **Dark Theme:** Chosen for a modern, focused look suitable for data visualization.
    *   **Information Hierarchy:** Panels (Dashboard, Event Detail) provide contextual information without permanently obscuring the main globe view. They are toggleable or appear on interaction.
    *   **Onboarding:** An initial info modal helps users understand the key interactive features.
    *   **Performance:** Debouncing interactions was crucial for maintaining a smooth experience.

This iterative process of choosing representations, implementing them, identifying issues (visual clutter, performance, usability), and refining the approach was central to the development.

## 6. Reflections on Large Dataset Handling and Visualization

This project served as a significant learning experience in managing and visualizing large geospatial-temporal datasets, particularly as a first-time endeavor with such scale and complexity. Several key strategies and insights emerged:

*   **Initial Data Ingestion and ETL:**
    *   The ACLED dataset, even when filtered for a specific region and timeframe (MENA, 1999-2025), can be substantial (potentially hundreds of thousands to millions of records if considering global data). The Python ETL script was crucial for initial cleaning, transformation (e.g., date parsing, ensuring consistent data types), and loading this data into a more queryable format in MongoDB.
    *   **Chunking (Implicit):** While not explicitly detailed in the ETL script provided during development, for extremely large CSVs, a production ETL process would typically read and process the CSV in chunks (e.g., using `pandas.read_csv(..., chunksize=...)`) to manage memory usage before batch inserting into MongoDB.

*   **Database Choice - MongoDB:**
    *   MongoDB (a NoSQL document database) proved suitable due to its flexibility with evolving data schemas and its powerful aggregation framework.
    *   **Geospatial Indexing:** For efficient querying of events within specific geographic bounds (e.g., for fetching events within a cluster), MongoDB's 2dsphere indexes are essential. This was assumed to be set up on the `location_geo` field.
    *   **Aggregation Framework:** This was heavily relied upon for server-side clustering (`$group`, `$trunc`, `$avg`) and for generating dashboard summaries (`$group`, `$sum`, `$project`). Performing these aggregations on the database server is far more efficient than sending large raw datasets to the client for processing.

*   **Server-Side Clustering - The Core Solution for Large Datasets:**
    *   The primary strategy to handle visualizing a large number of event points on the globe was **server-side clustering**. Instead of sending all individual event points to the frontend (which would overwhelm `react-globe.gl` and the browser), the backend API (`/api/events`) aggregates events into clusters.
    *   **Dynamic Grid-Based Clustering:** Events are grouped into geographic grid cells. The size (precision) of these cells is dynamically adjusted based on the client's current zoom level on the globe. This means:
        *   Zoomed out: Coarse grid, fewer but larger clusters, each representing many events.
        *   Zoomed in: Finer grid, more but smaller clusters, providing more detail.
    *   This approach significantly reduces the number of visual elements the frontend needs to render at any given time.

*   **Rendering Performance with Three.js (`react-globe.gl`):**
    *   **Custom Objects (`objectThreeObject`):** While `react-globe.gl` can render simple points efficiently, creating custom 3D objects (like our cones) for each cluster introduces more rendering overhead. The number of clusters sent from the backend was limited (e.g., to 2000) to maintain reasonable performance.
    *   **Object Instancing (Consideration for Future):** For very high numbers of identical or similar 3D objects, Three.js techniques like `InstancedMesh` would be the next step for performance optimization, though `react-globe.gl` might abstract some of this.
    *   **Debouncing Interactions:** Debouncing API calls triggered by map navigation (`mapView` changes) and hover effects (`onObjectHover`) was critical to prevent excessive re-renders and maintain a smooth user experience.

*   **Iterative Visualization Design:**
    *   The choice of how to represent clusters (points, colored points, 3D cones with height) was an iterative process driven by the need to balance information density with visual clarity and performance.
    *   Height encoding for cones (logarithmically scaled by event count) was a key decision to add another dimension to the visualization and help differentiate clusters in dense areas.
    *   The challenges with cone orientation and positioning highlighted the complexities of working with local vs. world coordinate systems and transformations when integrating custom Three.js objects into a library like `react-globe.gl`.

*   **Client-Side Data Handling for Charts:**
    *   Even with server-side aggregation for the globe, the dashboard charts (D3.js) sometimes needed to process arrays of data (e.g., `EventData[]` for a selected cluster). For the "overall summary" view, a dedicated backend endpoint (`/api/events/summary`) was created to provide pre-aggregated data directly suitable for the charts, avoiding client-side rollup of potentially very large datasets for the overview.

This project underscored the importance of a multi-faceted approach to large dataset visualization: efficient data storage and querying (MongoDB), server-side aggregation and processing to reduce data transfer, careful selection of visualization techniques (3D objects, dynamic clustering), and performance optimization strategies on the frontend (debouncing, efficient rendering).
