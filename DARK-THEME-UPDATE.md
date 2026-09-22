# Dark Theme & Contact Info Update ✅

The website has been completely transformed with a dark, elegant theme and updated contact information.

## 🎨 Color Palette Change

### Old Colors (Light Theme):
- Light Lavender #EAE7F8
- Off-White Sand #F2DDDC
- Soft Peach #F6BCBA
- Muted Orchid #E3AADD
- Soft Violet #C8A8E9
- Periwinkle #C3C7F4

### New Colors (Dark Theme):
- **Deep Black**: #0A0A0F (darkest)
- **Charcoal**: #1A1A24 (dark)
- **Dark Gray**: #2A2A35 (mid-tone)
- **Midnight**: #0F0F15 (very dark)
- **Gold**: #D4AF37 (accent color)
- **Light Gold**: #F4E5A1 (highlights)
- **Amber**: #C5A028 (gold dark shade)
- **Light Text**: #E0E0E8 (body text)

---

## 📋 Major Updates

### 1. Background
- Changed from pastel gradient to **dark elegant waves**
- Smooth dark gradient: Black → Charcoal → Dark Gray
- Matches the sleek background image provided

### 2. Header
- Dark semi-transparent background
- Gold border and accents
- Maintains glassmorphism effect

### 3. Company Cards
- Dark glassmorphism (dark gray with 75% opacity)
- Background images at 35% opacity
- Gold borders and accents
- Light text (#E0E0E8)

### 4. Contact Section (Footer)
**New Layout with 4 Contact Cards:**

#### 📞 Phone
- **Icon**: Phone symbol in gold gradient circle
- **Number**: 09278946416
- **Link**: Clickable tel: link

#### ✉️ Email
- **Icon**: Envelope symbol in gold gradient circle
- **Email**: info@connectore.com
- **Link**: Clickable mailto: link

#### 🌐 Website
- **Icon**: Globe symbol in gold gradient circle
- **URL**: connector.com
- **Link**: Opens in new tab

#### 📍 Address
- **Icon**: Location pin in gold gradient circle
- **Address**: 
  - Suite 1004 Atlanta Centre
  - Annapolis, San Juan, Philippines
- **Styled**: Multi-line with proper formatting

### 5. Three.js 3D Graphics
- Sphere color changed to **gold** (#D4AF37)
- Particles changed to **light gold** (#F4E5A1)
- Maintains animation and interactivity

### 6. Text Colors
- Primary text: Light gray (#E0E0E8)
- Headings: White with gold gradient
- Links: Gold with hover effects
- Badges: Gold accent colors

### 7. Buttons & CTAs
- Gold gradient (from gold to amber)
- Dark text for contrast
- Hover effects with brighter gold

### 8. Loading Screen
- Dark background (#0A0A0F)
- Gold spinner
- Gold text

---

## 🎯 Design Features

### Glassmorphism (Dark Version)
```css
Normal Glass:
- Background: rgba(30, 30, 40, 0.3)
- Blur: 20px
- Border: Gold 20% opacity

Strong Glass:
- Background: rgba(30, 30, 40, 0.75)
- Blur: 24px
- Border: Gold 30% opacity
- Shadow: Black 60% opacity
```

### Gold Accent System
- **Primary Gold**: #D4AF37
- **Hover Gold**: #C5A028 (darker)
- **Light Gold**: #F4E5A1 (highlights)
- Used for: Buttons, links, icons, borders, text highlights

### Typography
- **Headings**: Gold gradient (light gold → gold → amber)
- **Body**: Light gray (#E0E0E8)
- **Labels**: Gold
- **Links**: Gold with amber hover

---

## 📱 Contact Section Layout

```
┌─────────────────────────────────────────┐
│          CONTACT US (Gold Title)        │
│   Get in touch with Klassic Group...   │
├─────────────────┬───────────────────────┤
│  [📞] Phone     │  [✉️] Email           │
│  09278946416    │  info@connectore.com  │
├─────────────────┼───────────────────────┤
│  [🌐] Website   │  [📍] Address         │
│  connector.com  │  Suite 1004...        │
└─────────────────┴───────────────────────┘
```

### Features:
- 2×2 grid layout
- Glassmorphism cards
- Gold gradient icons
- Hover scale effect
- Responsive (stacks on mobile)
- All links are functional

---

## 🔄 Scroll Behavior

### Dark Gradient Transitions
As you scroll, the background smoothly transitions through:
1. **Deep Black** (#0A0A0F)
2. **Charcoal** (#1A1A24)
3. **Dark Gray** (#2A2A35)
4. **Back to Charcoal** (#1A1A24)
5. **Midnight** (#0F0F15)
6. **Back to Deep Black** (#0A0A0F)

---

## 📁 Files Changed

### Modified:
- `index.html` - Complete theme overhaul + contact section

### Created:
- `images/dark-wave-bg.jpg` - Background image placeholder
- `DARK-THEME-UPDATE.md` - This file

---

## 🎨 CSS Classes Updated

### New Color Classes:
- `.text-gold` - Gold text
- `.bg-dark-gray` - Dark gray background
- `.border-gold` - Gold border
- `.from-gold` - Gold gradient start
- `.to-amber-600` - Amber gradient end

### Updated Classes:
- `.glass` - Dark glassmorphism
- `.glass-strong` - Strong dark glassmorphism
- `.gradient-text` - Gold gradient
- `.site-header` - Dark header
- `.company-card` - Dark cards
- `.magnetic-btn` - Gold buttons

---

## 🚀 Testing Checklist

✅ Dark background displays correctly  
✅ Gold colors throughout the site  
✅ Header is dark with gold accents  
✅ Company cards have dark glassmorphism  
✅ Contact section with 4 info cards  
✅ Phone link works (tel:)  
✅ Email link works (mailto:)  
✅ Website link opens in new tab  
✅ Address displays properly  
✅ Three.js sphere is gold  
✅ Particles are light gold  
✅ Loading screen is dark with gold  
✅ Text is readable (light on dark)  
✅ Hover effects work  
✅ Mobile responsive  

---

## 📞 Contact Information Summary

| Type | Value |
|------|-------|
| **Phone** | 09278946416 |
| **Email** | info@connectore.com |
| **Website** | connector.com |
| **Address** | Suite 1004 Atlanta Centre, Annapolis, San Juan, Philippines |

---

## 🔧 How to Customize

### Change Gold Color:
Update in Tailwind config (line ~28):
```javascript
colors: {
  'gold': '#D4AF37', // Change this
}
```

### Adjust Darkness:
Update gradient colors (line ~258):
```css
background: linear-gradient(
  135deg,
  #0A0A0F 0%,  /* Adjust these */
  #1A1A24 20%,
  ...
);
```

### Modify Contact Cards:
Find the footer section (line ~1099):
- Update phone number
- Update email
- Update website URL
- Update address text

---

## 🌟 Design Inspiration

The dark theme is inspired by:
- Premium luxury websites
- Modern tech companies
- Apple's dark mode aesthetic
- The elegant wave pattern from your provided image

The gold accent color provides:
- Luxury and premium feel
- High contrast against dark background
- Brand consistency with Klassic Group logo
- Professional corporate image

---

**Status**: Dark theme with gold accents fully implemented!  
**Next**: Add your custom background image to replace the dark gradient
**View at**: http://localhost:3000
