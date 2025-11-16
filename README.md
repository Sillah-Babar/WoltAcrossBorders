# Jucntion - Food Delivery App

A modern food delivery and restaurant discovery application inspired by Wolt, featuring a dark theme UI.

## Features

- **3D Landing Page** - Interactive 3D character model viewer
- Dark-themed, modern interface
- Restaurant discovery
- Category browsing with horizontal scroll
- Location selection
- Search functionality
- User profile and cart

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Tech Stack

- React 18
- Vite
- Three.js & React Three Fiber (for 3D rendering)
- CSS3

## 3D Model

The landing page displays a 3D character model loaded from `/public/models/character.obj`. You can replace this file with your own OBJ model. The model is rendered using Three.js with interactive controls (rotate, zoom, pan).

**Note:** The current OBJ file is a placeholder. Replace `/public/models/character.obj` with your complete OBJ file for the full character model.

