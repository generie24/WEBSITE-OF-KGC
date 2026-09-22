# Company Card Background Images Reference

## Current Background Opacity Settings
- **Normal State**: 35% opacity
- **Hover State**: 50% opacity

---

## Background Images for Each Company Card

### Company 1: Brains Infinite Innovations Inc.
**Theme**: Technology / Innovation / Space  
**Current URL**: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80`  
**Description**: Technology/digital network visualization  
**Line in HTML**: ~579  
**Local Path** (when you add your own): `images/backgrounds/brains-bg.jpg`

---

### Company 2: Klassic Solutions Inc.
**Theme**: Team / Collaboration / Manpower  
**Current URL**: `https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80`  
**Description**: Business team collaboration  
**Line in HTML**: ~633  
**Local Path** (when you add your own): `images/backgrounds/klassic-solutions-bg.jpg`

---

### Company 3: Klassic Marketing Inc.
**Theme**: Global Business / Marketing / Trade  
**Current URL**: `https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80`  
**Description**: Business meeting/marketing  
**Line in HTML**: ~684  
**Local Path** (when you add your own): `images/backgrounds/klassic-marketing-bg.jpg`

---

### Company 4: Westwood Development Corp.
**Theme**: Construction / Development / Buildings  
**Current URL**: `https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80`  
**Description**: Construction site/building development  
**Line in HTML**: ~735  
**Local Path** (when you add your own): `images/backgrounds/westwood-dev-bg.jpg`

---

### Company 5: Westwood Law
**Theme**: Legal Services / Justice / Law  
**Current URL**: `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80`  
**Description**: Legal books/law office  
**Line in HTML**: ~785  
**Local Path** (when you add your own): `images/backgrounds/westwood-law-bg.jpg`

---

### Company 6: Connector
**Theme**: Software / Technology / Integration  
**Current URL**: `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80`  
**Description**: Data charts/analytics dashboard  
**Line in HTML**: ~835  
**Local Path** (when you add your own): `images/backgrounds/connector-bg.jpg`

---

### Company 7: The Green Oasis
**Theme**: Landscape / Nature / Gardening  
**Current URL**: `https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=80`  
**Description**: Landscape/garden/nature  
**Line in HTML**: ~887  
**Local Path** (when you add your own): `images/backgrounds/green-oasis-bg.jpg`

---

### Company 8: Luxurious Cleaning Co.
**Theme**: Cleaning Services / Professional Cleaning  
**Current URL**: `https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80`  
**Description**: Cleaning supplies/service  
**Line in HTML**: ~937  
**Local Path** (when you add your own): `images/backgrounds/luxurious-cleaning-bg.jpg`

---

### Company 9: HYT Foundation Inc.
**Theme**: Education / Youth Development / Foundation  
**Current URL**: `https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&q=80`  
**Description**: Education/students/learning  
**Line in HTML**: ~998  
**Local Path** (when you add your own): `images/backgrounds/hyt-foundation-bg.jpg`

---

### Company 10: The Finest Fit
**Theme**: Uniform / Clothing / Manufacturing  
**Current URL**: `https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1200&q=80`  
**Description**: Clothing/uniforms/textiles  
**Line in HTML**: ~1049  
**Local Path** (when you add your own): `images/backgrounds/finest-fit-bg.jpg`

---

## How to Change Background Images

### Method 1: Replace with Local Images
1. Add your image to `images/backgrounds/` folder
2. Find the company card in `index.html` (use line numbers above)
3. Change the URL:

**Before:**
```html
<div class="card-bg" style="background-image: url('https://images.unsplash.com/photo-XXX');"></div>
```

**After:**
```html
<div class="card-bg" style="background-image: url('images/backgrounds/your-image.jpg');"></div>
```

### Method 2: Use Different Online Images
Simply replace the entire Unsplash URL with your new image URL:
```html
<div class="card-bg" style="background-image: url('https://your-image-url.com/image.jpg');"></div>
```

---

## Recommended Image Specifications

- **Format**: JPG, PNG, or WebP
- **Resolution**: 1920x1080px or higher (landscape orientation)
- **File Size**: Under 500KB (optimize for web)
- **Aspect Ratio**: 16:9 recommended
- **Quality**: High quality but compressed for web

---

## Quick Find & Replace Template

To change a specific company background:

1. Open `index.html`
2. Press `Ctrl+F` (Find)
3. Search for: `company-X` (where X is the number 1-10)
4. Find the line with `<div class="card-bg" style="background-image:`
5. Replace the URL with your new image path

---

## Current Folder Structure

```
images/
├── backgrounds/          (Put your background images here)
│   └── README.txt
├── logos/               (Company logos - already populated)
│   ├── brains.svg
│   ├── klassic-solutions.svg
│   ├── klassic-marketing.svg
│   └── ... (7 more logos)
└── klassic-logo.svg     (Main site logo)
```

---

**Status**: Background opacity set to 35% (hover: 50%)  
**All backgrounds**: Currently using Unsplash placeholder images  
**Next step**: Replace with your company-specific images
