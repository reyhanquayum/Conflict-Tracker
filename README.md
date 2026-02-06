# MENA Conflict Tracker

[Live demo](https://conflict-tracker-ten.vercel.app/)

Interactive 3D globe showing geopolitical events in the Middle East and North Africa region (1999 -- May 2025). Data from [ACLED](https://acleddata.com).

## Gallery

<div style="display: flex; flex-wrap: wrap;">
  <img src="img/img1.png" alt="Dashboard and event panel" width="48%" style="margin-right: 2%;">
  <img src="img/img2.png" alt="Event cluster selected" width="48%;">
  <img src="img/img3.png" alt="Pie charts" width="48%" style="margin-right: 2%; margin-top: 10px;">
  <img src="img/img4.png" alt="Browse groups" width="48%" style="margin-top: 10px;">
</div>

## Stack

- **Frontend:** React, TypeScript, Vite, Three.js (`react-globe.gl`), D3.js, Tailwind, shadcn/ui
- **Backend:** Node.js, Express, MongoDB
- **ETL:** Python (`scripts/process_data.py`)

## Running locally

```bash
# install dependencies
npm install

# start backend (port 3001)
node api/index.cjs

# start frontend (port 5173, separate terminal)
npm run dev
```

Needs a `.env` in the project root with your MongoDB connection string:

```
MONGO_URI=your_mongodb_connection_string
```
