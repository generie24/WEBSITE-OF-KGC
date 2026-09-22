# 📁 Images Folder

Place your company images in this folder.

## 📂 Folder Structure

```
images/
├── logos/              # Company logo images
│   ├── brains.png
│   ├── klassic-solutions.png
│   ├── klassic-marketing.png
│   ├── westwood-dev.png
│   ├── westwood-law.png
│   ├── connector.png
│   ├── green-oasis.png
│   ├── luxurious-cleaning.png
│   ├── hyt-foundation.png
│   └── finest-fit.png
│
└── backgrounds/        # Background images for cards
    ├── brains-bg.jpg
    ├── solutions-bg.jpg
    ├── marketing-bg.jpg
    ├── westwood-dev-bg.jpg
    ├── westwood-law-bg.jpg
    ├── connector-bg.jpg
    ├── green-oasis-bg.jpg
    ├── cleaning-bg.jpg
    ├── hyt-bg.jpg
    └── finest-fit-bg.jpg
```

## 🎯 How to Add Your Images

### Step 1: Add Logo Files
1. Copy your company logo files into `images/logos/`
2. Rename them to match the names above (or use your own names)

### Step 2: Add Background Files
1. Copy your background images into `images/backgrounds/`
2. Rename them to match the names above

### Step 3: Update index.html

Open `index.html` and search for each company card:

**Example for Card 1 (Brains Infinite):**

Find these two lines:
```html
<!-- Logo -->
<img src="https://via.placeholder.com/80/9B7FD4/FFFFFF?text=B"

<!-- Background -->
<div class="card-bg" style="background-image: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80');">
```

Replace with:
```html
<!-- Logo -->
<img src="images/logos/brains.png"

<!-- Background -->
<div class="card-bg" style="background-image: url('images/backgrounds/brains-bg.jpg');">
```

## 📐 Image Specifications

### Logos
- **Size:** 200x200px to 500x500px
- **Format:** PNG (with transparency) or JPG
- **Background:** Transparent or white
- **File size:** < 100KB

### Backgrounds
- **Size:** 1920x1080px or larger
- **Format:** JPG (for photos)
- **Quality:** Medium to high (don't need ultra-high)
- **File size:** 200KB - 800KB

## ✅ Quick Checklist

- [ ] Created `images/logos/` folder
- [ ] Created `images/backgrounds/` folder
- [ ] Added 10 logo images
- [ ] Added 10 background images
- [ ] Updated all image URLs in index.html
- [ ] Tested website in browser

## 🔧 Troubleshooting

**Images not showing?**
- Check file names match exactly (case-sensitive)
- Check file extensions (.png, .jpg, not .PNG or .JPG)
- Check images are in correct folders
- Refresh browser with Ctrl+F5 (hard refresh)

**Images too large/slow?**
- Compress images at https://tinypng.com/
- Resize to recommended dimensions
- Convert to JPG if using PNG for photos
