# 🚗 ChapChap – Optimiseur de Trafic d'Abidjan

**ChapChap** est une application web/mobile innovante conçue pour aider les habitants d’Abidjan à éviter les embouteillages, choisir les meilleurs itinéraires, et recevoir des recommandations intelligentes grâce à l’intelligence artificielle.

---

## 📌 Fonctionnalités principales

- 🗺️ Carte interactive de Google Maps (trafic en temps réel)
- 🚧 Signalement d’incidents (accidents, bouchons, routes fermées)
- 📊 Suggestions IA basées sur l’heure et la zone (heures de pointe détectées)
- 🔁 Historique des trajets de l’utilisateur
- 🎭 Mode Simulation (fonctionne même sans API Google Maps)
- 📱 Interface mobile-first responsive
- 🇫🇷 Interface en français, prête pour multilingue

---

## 🧱 Stack technique

| Composant              | Technologie                                    |
| ---------------------- | ---------------------------------------------- |
| Frontend               | React (mobile-first)                           |
| Backend API            | FastAPI (Python)                               |
| Base de données        | MongoDB (MongoDB Atlas)                        |
| Cartographie           | Google Maps API                                |
| Mode Simulation        | Carte custom SVG/Canvas                        |
| Hébergement recommandé | Vercel (frontend) + Render ou Fly.io (backend) |

---

## ⚙️ Installation locale

### 🔧 Prérequis

- Node.js 18+
- Python 3.9+
- MongoDB Atlas (ou local)
- Clés API Google Maps

---

### 🚀 Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # ajouter MONGO_URL, DB_NAME et GOOGLE_MAPS_API_KEY
uvicorn main:app --reload
```

---

### 🌐 Frontend

```bash
cd frontend
npm install
cp .env.example .env  # ajouter REACT_APP_GOOGLE_MAPS_API_KEY et REACT_APP_BACKEND_URL
npm start
```

---

## 🔐 Variables d’environnement (à définir dans `.env`)

### Frontend (`frontend/.env`)

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Backend (`backend/.env`)

```env

MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/chapchap
DB_NAME=chapchap
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🧪 Tests

- Tous les endpoints FastAPI sont documentés via `/docs`
- Mode simulation testable en activant le toggle `Simuler`
- Responsive testé sur iOS, Android, desktop

---

## 📦 Déploiement

**Frontend** → [Vercel](https://vercel.com/)  
**Backend** → [Render](https://render.com/) ou [Fly.io](https://fly.io/)  
**Base de données** → [MongoDB Atlas](https://www.mongodb.com/atlas/database)

---

## 🔒 Sécurité

- Clés API dans `.env` (ne jamais les publier)
- `.gitignore` configuré pour exclure `.env`, `node_modules/`, `__pycache__/`

---

## 🤝 Contributeurs

- **Michael Touma** – Idéation, vision, pilotage
- Emergent Agent – Génération initiale du projet
- GPT-4 – Optimisation, IA, structuration

---

## 📄 Licence

© 2025 – Africa Invest Capital. Tous droits réservés.
