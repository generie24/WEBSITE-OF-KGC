# 🚀 Quick Start Guide - Klassic Group Premium Hub

## ⚡ Start the Server (Easiest Method)

```bash
node simple-server.js
```

**Then open your browser to:**
```
http://localhost:3000
```

---

## 🎨 What You'll See

### 1. **Loading Screen**
- Animated spinner with purple gradient
- 1.5 second transition

### 2. **Hero Section**
- 3D wireframe sphere that follows your mouse
- Floating particle system
- Animated title reveal: "Klassic Group of Companies"
- Magnetic CTA button: "Explore Our Subsidiaries"

### 3. **Dynamic Gradient Background**
- Smoothly transitions through 6 colors as you scroll:
  - Light Lavender → Warm Sand → Soft Peach → Muted Orchid → Soft Violet → Periwinkle

### 4. **10 Subsidiary Cards**
Each card features:
- Custom SVG motion graphic icon
- Glassmorphism effect (frosted glass)
- Hover elevation animation (lifts 8px)
- Magnetic "Visit Website" button
- Color-coded gradient badge

### 5. **Interactive Effects**
- **Mouse Tracking**: 3D sphere rotates with cursor movement
- **Scroll Animations**: Cards fade in and scale up
- **Parallax**: Background layers move at different speeds
- **Magnetic Buttons**: Buttons follow your cursor on hover

---

## 🎬 Animation Features

### GSAP ScrollTrigger
- Staggered text reveals
- Card entrance animations
- Parallax scrolling effects
- Elastic transitions

### Three.js 3D Graphics
- Wireframe icosahedron (sphere)
- 1000 floating particles
- Real-time mouse interaction
- Smooth 60 FPS animation

### Custom CSS
- Glassmorphism (backdrop-filter blur)
- Shimmer effects on Card 8
- Gradient text on titles
- Magnetic hover states

---

## 🎯 Key Interactions to Try

1. **Move your mouse** around the hero section → Watch the 3D sphere rotate
2. **Scroll down** slowly → See the background gradient morph
3. **Hover over cards** → They lift up with shadow
4. **Hover over buttons** → Magnetic pull effect + glow
5. **Scroll to each card** → Custom entrance animation

---

## 🔧 Other Server Options

### Express Server
```bash
node server.js
```

### TypeScript Server (requires npm install first)
```bash
npm install
npm run dev:ts
```

### Windows Batch File
```bash
start.bat
```

---

## 📊 Available Endpoints

Once the server is running:

| Endpoint | Description |
|----------|-------------|
| `http://localhost:3000` | Main homepage |
| `http://localhost:3000/health` | Health check (JSON) |
| `http://localhost:3000/api/subsidiaries` | All subsidiaries data (JSON) |

---

## 🎨 The 10 Subsidiaries

1. **Brains Infinite Innovations Inc.** - Tech network visualization
2. **Klassic Solutions Inc.** - Team flowchart graphic
3. **Klassic Marketing Inc.** - Global trade routes
4. **Westwood Development Corp.** - Isometric buildings
5. **Westwood Law** - Justice scales
6. **Connector** - Modular blocks connecting
7. **The Green Oasis** - Organic leaf growth
8. **Luxurious Cleaning Co.** - Sparkling particles ✨
9. **HYT Foundation Inc.** - Rising pillars
10. **The Finest Fit** - Fabric texture pattern

---

## 🛠️ Troubleshooting

### Server won't start?
```bash
# Kill any process on port 3000
netstat -ano | findstr :3000
# Then restart
node simple-server.js
```

### Animations not working?
- Check browser console (F12) for errors
- Ensure JavaScript is enabled
- Try Chrome/Firefox/Edge (latest versions)

### Performance issues?
- The Three.js 3D graphics can be CPU intensive
- Close other browser tabs
- Try disabling Three.js (edit index.html, comment out `initThree()`)

---

## 💡 Pro Tips

1. **Best viewed on desktop** - Large screens showcase the full motion graphics
2. **Use Chrome/Edge** - Best WebGL and backdrop-filter support
3. **Enable hardware acceleration** - For smooth 3D rendering
4. **Scroll slowly** - To fully appreciate the gradient transitions
5. **Try different screen sizes** - Responsive design adapts beautifully

---

## 🎓 Technical Stack

- **HTML5** - Semantic structure
- **Tailwind CSS** - Utility-first styling
- **GSAP 3.12** - Professional animations
  - ScrollTrigger plugin
  - ScrollTo plugin
- **Three.js r128** - 3D graphics engine
- **Node.js** - Simple HTTP server

---

## 📱 Mobile Experience

The site is fully responsive with:
- Single-column card layout
- Touch-friendly buttons
- Optimized font sizes
- Reduced animation complexity

---

## 🌟 Highlights

### Design Excellence
✅ High-end glassmorphism UI  
✅ Custom SVG motion graphics per company  
✅ Scroll-driven color morphing  
✅ 3D interactive background  

### Performance
✅ GPU-accelerated animations  
✅ Optimized rendering pipeline  
✅ Lazy-loaded animations  
✅ Smooth 60 FPS  

### User Experience
✅ Intuitive scroll navigation  
✅ Magnetic button interactions  
✅ Accessibility-friendly contrast  
✅ Fast load time  

---

## 🚀 Next Steps

1. **Explore the site** - Scroll through all 10 subsidiaries
2. **Test interactions** - Hover, click, scroll
3. **Check the API** - Visit `/api/subsidiaries`
4. **Customize** - Edit colors, animations, content
5. **Deploy** - Ready for production hosting

---

## 📧 Support

For questions or issues:
- Check README.md for detailed documentation
- Open browser DevTools (F12) for debug info
- Review animations.js for animation configurations

---

**Enjoy the premium interactive experience! 🎨✨**

© 2026 Klassic Group of Companies
