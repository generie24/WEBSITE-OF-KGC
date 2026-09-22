# 📸 Image Configuration Guide - Klassic Group

## 🎯 Quick Guide: How to Change Images

### Finding Your Card in index.html

Each company card has **TWO image locations**:

1. **Logo Image** - Company logo (56x56px area)
2. **Background Image** - Card background (full card, subtle overlay)

---

## 📋 Company Cards Reference

### Card 1: Brains Infinite Innovations Inc.
**Search for:** `<!-- Card 1: Brains Infinite`

**Logo URL to change:**
```html
<img src="YOUR_LOGO_URL_HERE" 
     alt="Brains Infinite Logo" 
     class="company-logo">
```

**Background URL to change:**
```html
<div class="card-bg" style="background-image: url('YOUR_BACKGROUND_URL_HERE');"></div>
```

**Current URLs:**
- Logo: `https://via.placeholder.com/80/9B7FD4/FFFFFF?text=B`
- Background: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80`

---

### Card 2: Klassic Solutions Inc.
**Search for:** `<!-- Card 2: Klassic Solutions`

**Logo URL to change:**
```html
<img src="YOUR_LOGO_URL_HERE" 
     alt="Klassic Solutions Logo" 
     class="company-logo">
```

**Background URL to change:**
```html
<div class="card-bg" style="background-image: url('YOUR_BACKGROUND_URL_HERE');"></div>
```

**Current URLs:**
- Logo: `https://via.placeholder.com/80/3B82F6/FFFFFF?text=KS`
- Background: `https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80`

---

### Card 3: Klassic Marketing Inc.
**Search for:** `<!-- Card 3: Klassic Marketing`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/10B981/FFFFFF?text=KM`
- Background: `https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&q=80`

---

### Card 4: Westwood Development Corp.
**Search for:** `<!-- Card 4: Westwood Development`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/F97316/FFFFFF?text=WD`
- Background: `https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80`

---

### Card 5: Westwood Law
**Search for:** `<!-- Card 5: Westwood Law`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/6366F1/FFFFFF?text=WL`
- Background: `https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80`

---

### Card 6: Connector
**Search for:** `<!-- Card 6: Connector`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/14B8A6/FFFFFF?text=C`
- Background: `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80`

---

### Card 7: The Green Oasis
**Search for:** `<!-- Card 7: The Green Oasis`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/84CC16/FFFFFF?text=GO`
- Background: `https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=80`

---

### Card 8: Luxurious Cleaning Co.
**Search for:** `<!-- Card 8: Luxurious Cleaning`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/0EA5E9/FFFFFF?text=LC`
- Background: `https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80`

---

### Card 9: HYT Foundation Inc.
**Search for:** `<!-- Card 9: HYT Foundation`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/F43F5E/FFFFFF?text=HYT`
- Background: `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80`

---

### Card 10: The Finest Fit
**Search for:** `<!-- Card 10: The Finest Fit`

**Current URLs:**
- Logo: `https://via.placeholder.com/80/F59E0B/FFFFFF?text=FF`
- Background: `https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=80`

---

## 🔧 Step-by-Step: How to Change Images

### Method 1: Using Local Images

1. **Create an images folder:**
   ```
   c:\Users\limco\Desktop\ide\ui\images\
   ```

2. **Add your company logos:**
   ```
   images/brains-logo.png
   images/klassic-solutions-logo.png
   images/klassic-marketing-logo.png
   ... etc
   ```

3. **Add background images:**
   ```
   images/brains-bg.jpg
   images/solutions-bg.jpg
   ... etc
   ```

4. **Update the HTML:**
   ```html
   <!-- Logo -->
   <img src="images/brains-logo.png" alt="Brains Infinite Logo" class="company-logo">
   
   <!-- Background -->
   <div class="card-bg" style="background-image: url('images/brains-bg.jpg');"></div>
   ```

### Method 2: Using External URLs

1. **Upload images to:**
   - Your company website
   - Cloud storage (Google Drive, Dropbox - public links)
   - Image hosting (Imgur, etc.)

2. **Get the direct image URL**

3. **Replace in HTML:**
   ```html
   <img src="https://your-domain.com/logo.png" ... >
   <div class="card-bg" style="background-image: url('https://your-domain.com/bg.jpg');"></div>
   ```

---

## 📐 Image Specifications

### Logo Images
- **Recommended size:** 200x200px minimum
- **Format:** PNG with transparency (preferred) or JPG
- **Aspect ratio:** Square (1:1)
- **File size:** Under 100KB
- **Display size:** 56x56px (auto-scaled)

### Background Images
- **Recommended size:** 1920x1080px or larger
- **Format:** JPG (preferred for photos)
- **Aspect ratio:** Landscape (16:9 or wider)
- **File size:** 200KB - 500KB (compressed)
- **Opacity:** Displayed at 8% (so don't worry about being too bright)

---

## 🎨 Design Tips

### Logo Guidelines
- ✅ High contrast logo
- ✅ Simple, recognizable design
- ✅ Works on white background
- ✅ SVG format is best (scalable)

### Background Image Guidelines
- ✅ Related to company's business
- ✅ Professional photography
- ✅ Not too busy or distracting
- ✅ Good contrast/lighting
- ❌ Avoid images with text
- ❌ Avoid overly bright colors

---

## 🚀 Quick Find & Replace

### Search Pattern in index.html:

**For Logos:**
```
Search: <img src="https://via.placeholder.com
Replace with your image URL
```

**For Backgrounds:**
```
Search: background-image: url('https://images.unsplash.com
Replace with your image URL
```

---

## 📝 Example: Complete Card Configuration

```html
<!-- Card 1: Brains Infinite Innovations Inc. -->
<article class="company-card glass-strong rounded-3xl p-8 md:p-12 relative overflow-hidden">
  
  <!-- BACKGROUND IMAGE - Change This URL -->
  <div class="card-bg" style="background-image: url('images/brains-bg.jpg');"></div>
  
  <!-- ... SVG icon code ... -->
  
  <div class="relative z-10">
    <div class="flex items-center gap-4 mb-6">
      
      <!-- LOGO IMAGE - Change This URL -->
      <img src="images/brains-logo.png" 
           alt="Brains Infinite Logo" 
           class="company-logo">
      
      <!-- Fallback gradient badge (shows if logo fails to load) -->
      <div class="w-14 h-14 ... " style="display:none;">1</div>
      
      <div>
        <h3>Brains Infinite Innovations Inc.</h3>
        <span>Innovation & Technology</span>
      </div>
    </div>
    <!-- ... rest of card content ... -->
  </div>
</article>
```

---

## 🔍 Finding Images in Code

### Open index.html and search for:

1. **Card 1:** Search `"Card 1: Brains"` → Find 2 image URLs
2. **Card 2:** Search `"Card 2: Klassic Sol"` → Find 2 image URLs
3. **Card 3:** Search `"Card 3: Klassic Mark"` → Find 2 image URLs
4. **Card 4:** Search `"Card 4: Westwood Dev"` → Find 2 image URLs
5. **Card 5:** Search `"Card 5: Westwood Law"` → Find 2 image URLs
6. **Card 6:** Search `"Card 6: Connector"` → Find 2 image URLs
7. **Card 7:** Search `"Card 7: The Green"` → Find 2 image URLs
8. **Card 8:** Search `"Card 8: Luxurious"` → Find 2 image URLs
9. **Card 9:** Search `"Card 9: HYT"` → Find 2 image URLs
10. **Card 10:** Search `"Card 10: The Finest"` → Find 2 image URLs

---

## 🎯 Summary Checklist

For each company card, you need to change:

- [ ] **Logo image URL** (`<img src="..."`)
- [ ] **Background image URL** (`background-image: url('...')`)

Total: **20 image URLs** to customize (2 per company × 10 companies)

---

## 💡 Pro Tips

1. **Keep original URLs as backup** - Comment them out instead of deleting:
   ```html
   <!-- Original: https://via.placeholder.com/80/9B7FD4/FFFFFF?text=B -->
   <img src="images/new-logo.png" ...>
   ```

2. **Test images locally first** - Make sure they load before going live

3. **Use relative paths** for local images:
   ```html
   <img src="images/logo.png">  ✅ Good
   <img src="./images/logo.png">  ✅ Good
   <img src="c:\Users\...\logo.png">  ❌ Bad (won't work in browser)
   ```

4. **Optimize images** - Use tools like TinyPNG.com to compress before uploading

---

## 📧 Need Help?

1. Open `index.html` in VS Code or any text editor
2. Use Ctrl+F (Find) to search for company names
3. Look for the two image URLs per card
4. Replace with your own URLs
5. Save and refresh browser

**That's it!** 🎉

---

Last Updated: $(Get-Date -Format "yyyy-MM-dd")
