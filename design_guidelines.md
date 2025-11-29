# MnetiFi SaaS Platform - Design Guidelines

## Design Approach
**Glassmorphism System** - Inspired by Vaultic.framer.website, this design emphasizes frosted glass effects, depth through blur, and floating radial gradients to create a premium, modern aesthetic for a multi-tenant Wi-Fi billing platform.

## Core Design Principles
1. **Mobile-First Performance** - Optimize all glass effects for mobile devices with fallbacks
2. **Depth Through Blur** - Create visual hierarchy using backdrop-filter blur layers
3. **Brand Prominence** - MnetiFi branding must be immediately visible and memorable
4. **Tenant Customization** - Support white-label branding overlays while maintaining core aesthetic

---

## Typography

**Primary Font:** Inter or Plus Jakarta Sans (via Google Fonts CDN)

**Hierarchy:**
- Hero/Display: 48px (mobile: 32px) / Bold / Letter-spacing: -0.02em
- Section Headers: 36px (mobile: 24px) / Semibold
- Card Titles: 20px / Semibold
- Body Text: 16px / Regular / Line-height: 1.6
- Input Labels: 14px / Medium / Uppercase / Letter-spacing: 0.05em
- Captions/Meta: 12px / Regular

**Colors:**
- Primary Text: #FFFFFF
- Secondary Text: #94a3b8
- Input Placeholder: rgba(255, 255, 255, 0.3)

---

## Color Palette

**Background System:**
- Base: Deep Navy #0f172a
- Mesh Gradients: Floating radial overlays using Neon Purple (#7c3aed), Cyan (#06b6d4), Magenta (#ec4899)
- Gradient positions: Scattered asymmetrically, animated subtle movement

**Glass Surfaces:**
- Fill: rgba(255, 255, 255, 0.05)
- Border Top: rgba(255, 255, 255, 0.2)
- Border Bottom: rgba(255, 255, 255, 0.05)
- Backdrop Blur: 16px with 180% saturation

**Accents:**
- Primary CTAs: Linear gradient Cyan (#06b6d4) to Blue (#3b82f6)
- M-Pesa Integration: #4BB617 (maintain brand color, adapt to glass aesthetic)
- Success States: Cyan gradient
- Error States: Magenta (#ec4899)
- Warning: Purple (#7c3aed)

---

## Layout System

**Spacing Scale:** Tailwind units of 4, 6, 8, 12, 16, 24
- Container padding: px-4 (mobile), px-8 (desktop)
- Section spacing: py-16 (mobile), py-24 (desktop)
- Card internal padding: p-6 (mobile), p-8 (desktop)
- Component gaps: gap-4 (mobile), gap-6 (desktop)

**Grid System:**
- Dashboard: 12-column grid, glass card containers
- Captive Portal: Single-column centered (max-w-md)
- Admin Panels: 2-column sidebar + content (sidebar w-64)

**Breakpoints:**
- Mobile: Base
- Tablet: md: (768px)
- Desktop: lg: (1024px)

---

## Component Library

**Glass Panels:**
- Border-radius: 24px
- Backdrop-filter: blur(16px) saturate(180%)
- Box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1)
- Border: 1px solid gradient (top: brighter, bottom: subtle)
- Mobile fallback: background: rgba(15, 23, 42, 0.95) when backdrop-filter unsupported

**Buttons:**
- Primary: Glass surface + gradient overlay, rounded-xl, px-8 py-4
- Secondary: Glass border only, rounded-xl, px-6 py-3
- Icon buttons: Circular (w-12 h-12), glass surface
- Hover state: Increase glass opacity to 0.1, subtle scale transform
- On images: Backdrop blur background

**Input Fields (Recessed Style):**
- Background: rgba(0, 0, 0, 0.3) - darker than surface to appear "inset"
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Rounded: rounded-lg
- Padding: px-4 py-3
- Focus: Border brightens to rgba(255, 255, 255, 0.3), cyan glow

**Cards:**
- Plan Cards: Glass panel with hover lift effect, gradient accent on top edge
- Transaction Cards: Compact glass rows with status indicators
- Hotspot Cards: Location icon + details, glass surface

**Navigation:**
- Top Nav: Fixed glass bar, blur background content behind
- Sidebar (Admin): Persistent glass panel, w-64, icons + labels
- Mobile: Slide-in drawer with glass backdrop

**Modals:**
- Overlay: rgba(0, 0, 0, 0.6) with backdrop blur
- Content: Large glass panel, centered, smooth Framer Motion entrance

**Status Indicators:**
- PENDING: Pulsing purple glow
- COMPLETED: Cyan checkmark with glass circle
- FAILED: Magenta X with glass circle

---

## Page-Specific Guidelines

**Captive Portal (Critical - User-Facing):**
- Full-screen animated mesh background
- Centered glass card (max-w-md)
- Large MnetiFi logo/wordmark at top
- Plan selection: Stacked glass cards, price prominent (gradient text)
- Phone input: Recessed style, Kenya flag prefix
- CTA: Full-width gradient button "Pay with M-Pesa" with M-Pesa logo
- Walled garden notice: Small glass footer with allowed domains
- Tenant branding: Logo overlay option in top-right corner

**Dashboard (Admin):**
- Glass sidebar navigation with icons
- Main content: Grid of metric cards (revenue, active users, transactions)
- Transaction table: Glass panel with row hover states
- Charts: Subtle glass containers with gradient data lines

**Plan Management:**
- Create/Edit: Modal with glass panel form
- List view: Grid of plan cards (3 columns desktop, 1 mobile)
- Each card: Bandwidth icons, duration, price in gradient text

---

## Animations

Use sparingly with Framer Motion:
- Page transitions: Fade + subtle scale (duration: 0.3s)
- Modal entrance: Scale from 0.95 to 1, opacity 0 to 1
- Mesh gradients: Slow drift animation (30-60s loop)
- Button interactions: Scale 0.98 on press
- Card hover: translateY(-4px), duration 0.2s

**Do NOT animate:** Input focus, text, constant UI elements

---

## Images

**Hero Section:** No traditional hero image. The animated mesh gradient background IS the hero visual element.

**Icons:** Use Heroicons via CDN for UI elements (payment, wifi, location, user icons)

**Logos:**
- MnetiFi: Minimal wordmark, likely white with gradient accent
- M-Pesa: Official logo maintained at 24px height
- Tenant logos: Support for custom upload (max 120px width)

**Illustrations:** None required - glass aesthetic is visual focus

---

## Accessibility

- Maintain 4.5:1 contrast for text on glass surfaces
- Focus states: Visible cyan outline on all interactive elements
- Keyboard navigation: Logical tab order
- Input labels: Always present, never placeholder-only
- Status announcements: Use ARIA live regions for transaction updates

---

## Mobile Optimization

- Touch targets: Minimum 44x44px
- Reduced blur on low-end devices (8px instead of 16px)
- Simplified gradients: 2 instead of 3 colors
- Sticky CTAs on payment flow
- Bottom sheet modals instead of centered