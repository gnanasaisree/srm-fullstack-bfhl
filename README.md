# SRM Full Stack Engineering Challenge

This repository contains my submission for the SRM Full Stack Engineering Challenge.

The project includes:
- a Node.js + Express backend with a `POST /bfhl` API
- a browser-based frontend to submit input edges and view the processed response

## Features

- Accepts node relationships in the form `A->B`
- Detects invalid entries
- Detects duplicate edges
- Builds hierarchy trees for valid acyclic graphs
- Detects cyclic components
- Returns a structured summary including:
  - total trees
  - total cycles
  - largest tree root

## Project Structure

```text
srm-fullstack-bfhl/
├── backend/
│   ├── index.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── README.md
```

## Backend API

### Endpoint

```http
POST /bfhl
Content-Type: application/json
```

### Sample Request

```json
{
  "data": ["A->B", "A->C", "B->D", "A->B", "X=>Y", "G->H", "H->G"]
}
```

### Sample Response

```json
{
  "user_id": "gnanasaisreeboppudi_16092006",
  "email_id": "gnanasiasree_boppudi@srmap.edu.in",
  "college_roll_number": "AP23110011630",
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "B": {
          "D": {}
        },
        "C": {}
      },
      "depth": 3
    },
    {
      "root": "G",
      "tree": {},
      "has_cycle": true
    }
  ],
  "invalid_entries": ["X=>Y"],
  "duplicate_edges": ["A->B"],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

## How To Run

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

Create or update `backend/.env`:

```env
PORT=3000
FULL_NAME=Gnanasai Sree Boppudi
DOB_DDMMYYYY=16092006
EMAIL_ID=gnanasiasree_boppudi@srmap.edu.in
COLLEGE_ROLL_NUMBER=AP23110011630
```

### 3. Start the backend

```bash
cd backend
npm start
```

The backend runs at:

```text
http://localhost:3000
```

### 4. Open the frontend

Open this URL in the browser:

```text
http://localhost:3000/app
```

## Frontend Usage

- Enter one edge per line in the textarea
- Click `Analyze Hierarchy`
- View:
  - summary cards
  - hierarchies
  - invalid entries
  - duplicate edges
  - raw JSON response

## Technologies Used

- Node.js
- Express.js
- JavaScript
- HTML
- CSS

## Submission Notes

- Backend and frontend are both included in this repository
- The frontend is served through the Express backend
- The API response includes the required personal fields from `.env`
