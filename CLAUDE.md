# PROJECT_CONTEXT_V3.md — NOOS Store

> **Primary source of truth for Claude Code implementation.**
> Supersedes: PROJECT_CONTEXT_V2.md
> Generated: 2026-06-08
> Status: FINAL — includes full UI/UX design system, all 10 pages, component specs, and implementation rules.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Brand Overview](#2-brand-overview)
3. [Business Requirements](#3-business-requirements)
4. [Functional Requirements](#4-functional-requirements)
5. [User Roles](#5-user-roles)
6. [Design System — Tokens](#6-design-system--tokens)
7. [Design System — Typography](#7-design-system--typography)
8. [Design System — Components](#8-design-system--components)
9. [Page Specifications — All 10 Pages](#9-page-specifications--all-10-pages)
10. [Customer Journey](#10-customer-journey)
11. [Admin Journey](#11-admin-journey)
12. [MySQL Database Architecture](#12-mysql-database-architecture)
13. [Entity Relationship Design](#13-entity-relationship-design)
14. [Product Management Structure](#14-product-management-structure)
15. [Inventory Management Structure](#15-inventory-management-structure)
16. [Order Management Flow](#16-order-management-flow)
17. [Checkout Flow](#17-checkout-flow)
18. [Authentication Flow](#18-authentication-flow)
19. [Frontend Architecture](#19-frontend-architecture)
20. [Backend Architecture](#20-backend-architecture)
21. [API Architecture](#21-api-architecture)
22. [Components To Reuse](#22-components-to-reuse)
23. [Components To Refactor](#23-components-to-refactor)
24. [Components To Create](#24-components-to-create)
25. [Migration Strategy](#25-migration-strategy)
26. [Development Guidelines](#26-development-guidelines)
27. [Future Scalability](#27-future-scalability)

---

## 1. Executive Summary

NOOS ("Never Out Of Stock") is a modern men's wear eCommerce platform for Egyptian men aged 20–35. It is built on an Express + Vanilla JS stack, replacing a MongoDB-backed makeup store (DomDom) with a MySQL-backed menswear platform.

**The four pillars of the transformation:**

1. **Brand** — Dark, masculine, modern. Ink black primary, forest green accent, off-white surfaces. Bebas Neue display font. No pink, no blush, no feminine aesthetics.
2. **Database** — MongoDB → MySQL. Relational schema with proper FKs, variant-level inventory, coupon system.
3. **Product Domain** — Makeup → Menswear. Size × colour variants replace the colour sub-document.
4. **UI/UX** — Fully designed and specified. 10 pages with pixel-level component rules. Claude Code must implement exactly as specified in Section 9.

**Architecture preserved:** Express server, Vanilla JS frontend, JWT auth, localStorage cart, single-file admin panel, Multer image uploads, Egypt city shipping.

---

## 2. Brand Overview

| Attribute | Value |
|-----------|-------|
| Brand Name | NOOS |
| Full Form | Never Out Of Stock |
| Tagline | Built for every day. Never out of stock. |
| Currency | EGP (Egyptian Pounds) |
| Market | Egypt — nationwide delivery |
| Target | Men aged 20–35 |
| Personality | Modern, masculine, minimal, confident, urban |
| Logo font | Bebas Neue — uppercase, tight kerning |
| Sub-tagline under logo | "Never Out Of Stock" — 7px, 0.3em letter-spacing, forest green |

### Product Categories (12)

T-Shirts · Oversized T-Shirts · Shirts · Polo Shirts · Jeans · Trousers · Chinos · Jackets · Hoodies · Sweatshirts · Knitwear · Accessories

---

## 3. Business Requirements

| Requirement | Value |
|-------------|-------|
| Currency | EGP |
| Payment | Cash on Delivery only (COD) |
| Free Shipping Threshold | 500 EGP |
| Shipping Scope | All Egyptian governorates |
| Markup | None — admin sets prices explicitly |
| Newsletter Code | `NOOS10` — 10% off (marketing only, not server-enforced at launch) |
| Guest Checkout | Supported |
| Registered Checkout | Supported — order linked to account |

---

## 4. Functional Requirements

### Customer

| Feature | Priority |
|---------|----------|
| Browse catalogue | P0 |
| Search by name/SKU | P0 |
| Filter by category, size, colour, price | P0 |
| Sort: newest, price, bestseller, rating | P0 |
| Product detail + variant selector (size × colour) | P0 |
| Interactive quantity control with live price update | P0 |
| Add to cart / update / remove | P0 |
| Persistent cart (localStorage) | P0 |
| Checkout with shipping form (COD) | P0 |
| Guest checkout | P0 |
| Order confirmation screen | P0 |
| User registration + login | P1 |
| Account dashboard | P1 |
| Order history + tracking progress | P1 |
| Profile management | P1 |
| Address book | P1 |
| Wishlist | P1 |
| Product reviews | P1 |
| Coupon code at checkout | P1 |
| Newsletter subscription | P2 |

### Admin

| Feature | Priority |
|---------|----------|
| Dashboard stats | P0 |
| Product CRUD + images | P0 |
| Category CRUD | P0 |
| Variant management | P0 |
| Inventory per variant | P0 |
| Order management + status update | P0 |
| Low-stock alerts | P0 |
| Customer management | P1 |
| Coupon management | P1 |
| Quick actions panel | P1 |

---

## 5. User Roles

| Role | localStorage key | Access |
|------|-----------------|--------|
| `guest` | — | Browse, cart, guest checkout |
| `user` | `noos_token`, `noos_user` | + account, wishlist, orders, reviews |
| `admin` | `noos_token`, `noos_user` | Full admin panel |

JWT payload: `{ id, name, email, role }` — 7-day lifetime.

---

## 6. Design System — Tokens

### Colour Palette

All CSS custom properties defined in `frontend/css/global.css :root`.

```css
:root {
  /* Core */
  --ink:       #0D0D0D;   /* Primary text, buttons, nav background */
  --ink2:      #1A1A1A;   /* Hero background, dark sections */
  --ink3:      #2A2A2A;   /* Admin sidebar, secondary dark surfaces */
  --slate:     #4A4A4A;   /* Secondary text on light surfaces */
  --muted:     #8A8A87;   /* Placeholder text, captions, labels */

  /* Surfaces */
  --surf:      #EFEFED;   /* Cards, category boxes, image placeholders */
  --mist:      #F7F7F5;   /* Main page background */
  --warm:      #F5F2EC;   /* Newsletter section, warm accent sections */
  --white:     #FFFFFF;   /* Form fields, product info panels */

  /* Brand Accent — Forest Green */
  --grn:       #4A6741;   /* Primary accent: badges, active states, strip, icons */
  --grn2:      #3A5232;   /* Hover/dark green: admin sidebar active border */
  --grn3:      #2D4128;   /* Admin sidebar background */
  --grn-lt:    #D4E2CF;   /* Light green: admin sidebar text, borders */
  --grn-pale:  #EBF0E8;   /* Very light green: active nav bg, success backgrounds */

  /* Secondary Accents */
  --gold:      #A0843A;   /* Stars, camel colour swatch, gold stat card accent */
  --gold-lt:   #F0E8D0;   /* Light gold background */
  --red:       #B03A2E;   /* Sale badge, low-stock, error, delete actions */
  --red-lt:    #F5E8E6;   /* Light red background for error states */

  /* Borders */
  --border:    #DCDCDA;   /* Standard dividers and card borders */
  --border2:   #C8C8C5;   /* Stronger borders: form inputs, size buttons */
}
```

### Colour Usage Rules

- `--ink` background → white text ONLY
- `--grn` background → white text ONLY
- `--surf` / `--mist` background → `--ink` or `--slate` text
- `--warm` background → `--ink` text
- NEVER use `--muted` text on `--surf` for anything interactive
- Sale prices: always `--red`
- In-stock indicator: always `--grn`
- Low-stock / error: always `--red`
- Admin stat card accents: green (products), gold (orders), ink (revenue), slate (customers)

### Spacing

8px base. Scale: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48px.

### Border Radius

- Buttons, inputs, badges: 0 (zero — sharp edges, masculine aesthetic)
- Stat cards, form section wrappers: `border-radius: 4px` maximum
- NO rounded corners on buttons — this is a hard rule

### Borders

- Standard: `0.5px solid var(--border)`
- Input/interactive: `1px solid var(--border2)`
- Admin stat card left accent: `3px solid var(--grn)` (or gold/ink/slate per card)
- Admin sidebar active: `border-left: 2px solid var(--grn-lt)`

---

## 7. Design System — Typography

### Font Stack

```css
/* Import in every HTML page <head> */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

:root {
  --ff: 'Bebas Neue', Impact, sans-serif;   /* Display/headings */
  --fb: 'DM Sans', sans-serif;              /* Body/UI */
}
```

### Type Scale

| Role | Font | Size | Weight | Letter-spacing | Usage |
|------|------|------|--------|----------------|-------|
| Display | Bebas Neue | 72–100px | 400 | 0.02em | Hero headline |
| H1 | Bebas Neue | 36–52px | 400 | 0.04em | Section headings, page titles |
| H2 | Bebas Neue | 28–32px | 400 | 0.04em | Sub-section titles |
| H3 | DM Sans | 14–16px | 500 | 0.04em | Card titles, admin section labels |
| Nav Links | DM Sans | 11px | 400 | 0.12em | Uppercase |
| Body | DM Sans | 12–13px | 400 | 0 | Product descriptions, body copy |
| Label | DM Sans | 9–10px | 500 | 0.12–0.2em | Uppercase form labels, filter titles |
| Caption | DM Sans | 9–10px | 400 | 0.06em | Meta info, timestamps, counts |
| Badge | DM Sans | 8px | 500 | 0.12em | Uppercase |
| Price | DM Sans | 13–24px | 500 | 0 | Product prices |
| Logo main | Bebas Neue | 24px | 400 | 0.12em | Nav logo |
| Logo sub | DM Sans | 7px | 300 | 0.3em | "Never Out Of Stock" under logo |

### Text Rules

- Section headings: ALWAYS Bebas Neue, uppercase naturally
- ALL CAPS manually in CSS only for: nav links, labels, badges, strip text, button text
- No italic text anywhere in the UI
- No bold (`font-weight: 700`) — maximum weight is 500 for DM Sans

---

## 8. Design System — Components

### 8.1 Navigation Bar

```
Height: 54px
Background: var(--ink)
Layout: [Logo Left] [Nav Links Center] [Icons Right]

Logo:
  - "NOOS" — Bebas Neue 24px, #fff, letter-spacing 0.12em
  - "Never Out Of Stock" — DM Sans 7px, font-weight 300, letter-spacing 0.3em, color var(--grn)

Nav Links (Home, Shop, About, Contact):
  - DM Sans 11px, font-weight 400, letter-spacing 0.12em, uppercase
  - Color: rgba(255,255,255,0.55) default
  - Hover: #fff
  - Active (current page): #fff + border-bottom: 2px solid var(--grn)
  - Padding: 0 14px, full height 54px (flex align-items center)

Icons (right side):
  - Search, Heart (wishlist), User (account), Shopping Bag (cart)
  - Font-size: 17px, color: rgba(255,255,255,0.65)
  - Cart icon has badge: 13×13px circle, background var(--grn), white text 9px

NOTE: Nav links are ALWAYS: Home · Shop · About · Contact
      Admin link appears only when Auth.isAdmin() === true
```

### 8.2 Announcement Strip

```
Background: var(--grn)
Padding: 8px 0
Content: repeating marquee text
Font: DM Sans 10px, font-weight 500, letter-spacing 0.18em, uppercase
Color: rgba(255,255,255,0.9)
Separator: "—" in rgba(255,255,255,0.35)

Text items: "Free shipping over 500 EGP" · "New arrivals weekly" ·
            "Cash on delivery" · "Never out of stock" · "Premium everyday wear"
```

### 8.3 Hero Section (Homepage only)

```
Height: 330px
Layout: 2-column grid (1fr 1fr)

LEFT PANEL:
  Background: var(--ink2)
  Padding: 36px 28px
  Content (bottom-aligned, flex-direction: column, justify-content: flex-end):
    - Eyebrow: "Summer Collection 2026" — DM Sans 10px, 500, 0.35em, uppercase, var(--grn)
    - Animated NOOS letters (see animation spec below)
    - Green underline sweep animation
    - Subtitle: "Built for every day. Never out of stock." — DM Sans 12px, rgba(255,255,255,0.45)
    - CTA Button: "Shop Now →" — white background, ink text, DM Sans 11px 500 uppercase

RIGHT PANEL:
  Background: var(--ink3) (#2A2A2A)
  Content: ghost "NOOS" text (Bebas Neue 160px, rgba(255,255,255,0.04), bottom-right)
  Tag: "SS 26" — top-right, var(--grn) background, white text 9px uppercase
  Bottom accent bar: 3px height, flex row: [2fr green][1fr near-black][1fr very dark]

NOOS LETTER ANIMATION:
  Each letter fades in + slides up from 20px, 0.5s ease, staggered:
    N: delay 0.1s, color #fff
    O: delay 0.22s, color var(--grn)
    O: delay 0.34s, color #fff
    S: delay 0.46s, color var(--grn)
  Font: Bebas Neue 100px, line-height 1, letter-spacing 0.05em
  After letters: green underline sweeps left→right in 0.5s (delay 0.65s)
  Ghost NOOS: slow opacity pulse between 0.04 and 0.10, 3s infinite loop
```

### 8.4 Product Card

```
Structure:
  [Image Area 3:4 aspect ratio]
  [Category label]
  [Product name]
  [Price row]
  [Colour dots row]

Image Area:
  Background: var(--surf)
  Position: relative
  Badge: top-left, 0px offset, 4px 8px padding, 8px font, 0.12em spacing
    - "New": background var(--ink), color #fff
    - "Bestseller": background var(--grn), color #fff
    - "Sale": background var(--red), color #fff
  Wishlist heart: top-right, 26×26px white box, ink icon 14px

Category label:
  DM Sans 9px, font-weight 500, letter-spacing 0.1em, uppercase, color var(--grn)
  Margin-bottom: 2px

Product name:
  DM Sans 13px, font-weight 500, color var(--ink), line-height 1.3
  Margin-bottom: 4px

Price row:
  Current price: DM Sans 13px, font-weight 500, var(--ink)
  Old price: DM Sans 11px, var(--muted), text-decoration line-through
  Gap: 6px

Colour dots:
  10×10px circles, border-radius 50%, border 0.5px solid var(--border)
  Margin-top: 5px, gap: 4px
```

### 8.5 Size Selector (PDP)

```
Layout: CSS grid, 6 columns, gap 5px

Each size button:
  Height: 36px
  Background: var(--white)
  Border: 1px solid var(--border2)  ← MUST be visible
  Font: DM Sans 11px, font-weight 500, color var(--ink3)
  Cursor: pointer

  Active state:
    Background: var(--ink)
    Color: #fff
    Border: 1px solid var(--ink)

  Out-of-stock state:
    Color: var(--border2)  ← greyed out
    Text-decoration: line-through
    Cursor: not-allowed
    Background: var(--surf)

IMPORTANT: sizes must ALWAYS be visible — white background, ink border.
           Never use transparent background or border-color matching background.
```

### 8.6 Colour Swatches (PDP)

```
Each swatch:
  Width/Height: 26px, border-radius 50%
  Border: 2px solid transparent (default)
  Cursor: pointer

  Active state:
    Border-color: matching the swatch colour (dark swatches: var(--ink))
    Outline: 2px solid var(--ink), outline-offset 2px

Colour label:
  DM Sans 10px, var(--slate), updates on swatch click
  Shows current colour name next to "Colour —" label
```

### 8.7 Add to Cart Button (PDP)

```
Width: 100%
Padding: 14px
Background: var(--ink)   ← MUST be dark ink, always visible
Color: #fff
Border: none
Font: DM Sans 12px, font-weight 500, letter-spacing 0.14em, uppercase
Display: flex, align-items center, justify-content center, gap 9px
Icon: ti-shopping-bag 16px
Content: "Add to Cart — EGP [live price]"
  - Price updates dynamically when quantity changes
Margin-bottom: 8px

IMPORTANT: This button must ALWAYS be fully visible with high contrast.
           Dark background, white text, full width.
```

### 8.8 Quantity Control (PDP)

```
Container: flex row, gap 10px, align-items center

Qty control box:
  Display: flex
  Background: var(--white)
  Border: 1px solid var(--border2)

  Minus button: 36px wide × 38px tall, font-size 20px, color var(--ink)
  Value display: 44px wide, font-size 14px, font-weight 500, color var(--ink)
    Border-left: 1px solid var(--border2)
    Border-right: 1px solid var(--border2)
  Plus button: same as minus

Stock indicator:
  Font: DM Sans 10px, font-weight 500, color var(--grn)
  Icon: ti-circle-check 13px inline
  Text: "12 in stock"
```

### 8.9 Wishlist Button (PDP)

```
Width: 100%
Padding: 11px
Background: transparent
Color: var(--slate)
Border: 1px solid var(--border2)   ← visible outline
Font: DM Sans 11px, letter-spacing 0.12em, uppercase
Display: flex, align-items center, justify-content center, gap 8px
Icon: ti-heart
```

### 8.10 Primary Button (General)

```
Padding: 13px 24px (or width 100% for full-width)
Background: var(--ink)
Color: #fff
Border: none
Font: DM Sans 11px, font-weight 500, letter-spacing 0.14em, uppercase
Display: flex, align-items center, justify-content center, gap 8px
Border-radius: 0 (sharp)
```

### 8.11 Green Button

```
Same as Primary Button but:
Background: var(--grn)
Color: #fff
```

### 8.12 Outline Button

```
Same padding as Primary
Background: transparent
Color: var(--slate)
Border: 0.5px solid var(--border2)
```

### 8.13 Form Fields

```
Label:
  DM Sans 10px, font-weight 500, letter-spacing 0.1em, uppercase
  Color: var(--slate)
  Margin-bottom: 5px

Input / Select / Textarea:
  Width: 100%
  Padding: 10px 12px
  Background: var(--white)
  Border: 0.5px solid var(--border2)
  Border-radius: 0 (sharp)
  Font: DM Sans 12px, color var(--ink)
  Outline: none on focus (use border-color change instead)

Textarea: height 80px, resize none
```

### 8.14 Status Pills

```
Display: inline-block
Padding: 3px 9px
Font: DM Sans 9px, font-weight 500, letter-spacing 0.1em, uppercase
Border-radius: 2px

Pending:    background #F5F0DC, color #7A6020
Processing: background var(--grn-pale), color var(--grn2)
Shipped:    background var(--surf), color var(--slate)
Delivered:  background #E0EDE0, color #2A562A
Cancelled:  background var(--red-lt), color var(--red)
```

### 8.15 Admin Stat Cards

```
Background: var(--white)
Border: 0.5px solid var(--border)
Border-radius: 4px
Padding: 12px 14px
Border-left: 3px solid [accent colour]

Label: DM Sans 9px, font-weight 500, letter-spacing 0.1em, uppercase, var(--muted)
Value: Bebas Neue 22px, letter-spacing 0.04em, var(--ink)
Sub:   DM Sans 9px, [accent colour]

Accent colours per card:
  Products → var(--grn)
  Orders   → var(--gold)
  Revenue  → var(--ink)
  Customers → var(--slate)
```

### 8.16 Admin Sidebar

```
Background: var(--grn3) = #2D4128
Width: 148px

Logo bar:
  Padding: 16px 14px 14px
  Border-bottom: 0.5px solid rgba(255,255,255,0.08)
  "NOOS" — Bebas Neue 20px, letter-spacing 0.14em, #fff
  "Admin Panel" — DM Sans 7px, letter-spacing 0.25em, var(--grn-lt)

Group sections (Overview / Catalogue / Commerce):
  Group label: DM Sans 8px, letter-spacing 0.2em, uppercase, rgba(255,255,255,0.25)
  Padding: 0 14px 6px
  Border-bottom: 0.5px solid rgba(255,255,255,0.06)

Nav items:
  Padding: 8px 14px
  Font: DM Sans 11px, rgba(255,255,255,0.4)
  Icon: 15px
  Gap: 8px
  Border-left: 2px solid transparent

  Active state:
    Background: rgba(255,255,255,0.07)
    Color: #fff
    Border-left: 2px solid var(--grn-lt)

  Hover state:
    Background: rgba(255,255,255,0.04)
    Color: rgba(255,255,255,0.7)

Admin nav groups and items:
  Overview: Dashboard
  Catalogue: Products, Categories, Variants, Inventory
  Commerce: Orders, Customers, Coupons
  Bottom: Settings, Logout
```

### 8.17 Admin Table

```
Width: 100%
Border-collapse: collapse
Table-layout: fixed (prevents overflow)
Font-size: 11px

Header row:
  Background: var(--surf)
  Font: DM Sans 9px, weight 500, letter-spacing 0.1em, uppercase, var(--muted)
  Padding: 7px 10px
  Border-bottom: 0.5px solid var(--border)

Data row:
  Padding: 9px 10px
  Border-bottom: 0.5px solid var(--border)
  Color: var(--ink3)
  Overflow: hidden, text-overflow ellipsis, white-space nowrap

  Hover: background var(--mist)
  Last row: no border-bottom

Action buttons in table:
  Padding: 3px 9px
  Font: DM Sans 9px, letter-spacing 0.08em, uppercase
  Border: 0.5px solid
  Background: transparent
  "View"/"Edit": border-color var(--grn), color var(--grn)
  "Delete": border-color var(--red), color var(--red)
```

### 8.18 Breadcrumb

```
Background: var(--surf)
Border-bottom: 0.5px solid var(--border)
Padding: 10px 22px
Font: DM Sans 11px, var(--muted)
Separator: ti-chevron-right icon 10px
Current page: color var(--ink3), font-weight 500
```

### 8.19 Footer

```
Background: var(--ink)
Padding: 28px 22px 18px
Border-top: 0.5px solid #222

Layout: 3-column grid (2fr 1fr 1fr)

Column 1 (Brand):
  "NOOS" — Bebas Neue 20px, letter-spacing 0.12em, #fff
  Tagline — DM Sans 11px, rgba(255,255,255,0.22), max-width 175px, line-height 1.6
  Social icons — ti-brand-instagram, ti-brand-tiktok, ti-brand-facebook — 15px, rgba(255,255,255,0.28)

Column 2 (Navigate):
  Title: DM Sans 9px, letter-spacing 0.22em, uppercase, rgba(255,255,255,0.22)
  Links: Home, Shop, About, Contact — DM Sans 11px, rgba(255,255,255,0.42)

Column 3 (Help):
  Title: same as Navigate
  Links: Track Order, Size Guide, Returns, FAQ, Contact

Bottom bar:
  Border-top: 0.5px solid #222
  "© 2026 NOOS. All rights reserved." — DM Sans 10px, rgba(255,255,255,0.18)
  "Cairo, Egypt · COD" — same style, right-aligned
```

### 8.20 Order Progress Tracker

```
Layout: flex row, relative positioning
Items: Placed → Processing → Shipped → Delivered

Track dot: 10×10px circle
  Completed: background var(--grn)
  Current: background var(--grn) + outline 3px solid var(--grn-pale) outline-offset 1px
  Future: background var(--border2)

Connecting line: 1px horizontal
  Completed segment: var(--grn)
  Future segment: var(--border2)
  Position: absolute, vertically centered behind dots

Label: DM Sans 9px, letter-spacing 0.06em, uppercase
  Completed: var(--grn)
  Future: var(--muted)
```

---

## 9. Page Specifications — All 10 Pages

### 9.1 Homepage (`index.html`)

**URL:** `noos.eg`
**Nav active link:** Home

**Sections in order:**

1. **Navigation** — See §8.1. Links: Home (active) · Shop · About · Contact
2. **Hero** — See §8.3. Full 330px split-panel hero with animated NOOS.
3. **Announcement Strip** — See §8.2. Forest green background.
4. **Category Grid** — Background var(--surf), padding 24px 22px, border-bottom
   - Header: "Categories" (Bebas Neue 32px) + "View All →" link
   - Grid: 6 columns, each: dark box (ink2 bg) + bottom green border if active + label
   - Show: T-Shirts (active), Shirts, Polo, Jeans, Chinos, Jackets
5. **New Arrivals** — Background var(--mist), padding 28px 22px
   - Header: "New Arrivals" + "View All →"
   - Product grid: 3 columns, 3 cards (Boxy Tee/New, Oxford/Bestseller, Chino/Sale)
6. **Best Sellers** — Same layout as New Arrivals (different products)
7. **Why NOOS** — Background var(--ink2), padding 28px 22px
   - Header: "Why NOOS" (white)
   - 4-column icon grid: Always In Stock · Premium Quality · Fast Delivery · Easy Returns
   - Icons: ti-refresh, ti-award, ti-truck, ti-shield-check — all var(--grn)
8. **Newsletter** — Background var(--warm), centered, padding 36px 22px
   - Eyebrow: "Join The Club" — DM Sans 9px, grn2, uppercase
   - Heading: "10% OFF YOUR FIRST ORDER" — Bebas Neue 36px
   - Subtitle: DM Sans 12px, muted
   - Email input + "Subscribe" button (inline, button is ink background)
9. **Footer** — See §8.19. Navigate column: Home, Shop, About, Contact.

### 9.2 Shop Page (`pages/shop.html`)

**URL:** `noos.eg/shop`
**Nav active link:** Shop

**Layout:** 2-column (155px sidebar + 1fr main)

**Left Sidebar:**
- Background: var(--surf), border-right: 0.5px solid var(--border)
- "Filters" header — DM Sans 9px, muted, uppercase, border-bottom
- Filter sections:
  - **Category**: checkboxes with `accent-color: var(--ink)` — All (checked), T-Shirts, Shirts, Polo, Jeans, Chinos, Jackets, Hoodies, Sweatshirts, Knitwear, Accessories
  - **Size**: 3-column grid of size chips — XS S M L XL XXL. Active: ink bg + white text
  - **Colour**: checkboxes — Black, White, Forest Green, Navy, Camel, Olive, Grey
  - **Price (EGP)**: range slider, `accent-color: var(--ink)`, displays current max value
  - **Badge**: checkboxes — New, Sale, Bestseller

**Right Main:**
- Background: var(--mist), padding 18px 16px
- Top bar: "48 products" (muted) + sort dropdown
- Product grid: 2 columns, gap 10px

**Product cards in shop:** same spec as §8.4 but 3:4 aspect ratio image.

### 9.3 Product Detail Page (`pages/product.html`)

**URL:** `noos.eg/product?id=X`
**Nav active link:** Shop

**Layout:** 2-column grid (1fr 1fr)

**Left — Gallery:**
- Background: var(--surf)
- Min-height: 400px
- Centered product image (placeholder: ti-shirt icon 70px, var(--border2))
- Badge: top-left, 0px offset, green "Bestseller" background
- Thumbnails: bottom-left, 3 thumbnails 30×38px, active has 1.5px ink border

**Right — Product Info:**
- Background: var(--white), border-left: 0.5px solid var(--border), padding 24px 20px
- Elements in order:
  1. Category label (§8.4 style)
  2. Product name — Bebas Neue 28px, letter-spacing 0.04em
  3. Rating row — gold stars (★★★★★) 12px + "4.8 · 124 reviews" muted 10px
  4. Price row — current price 24px weight 500 + old price struck-through + discount % badge (red-lt bg, red text)
  5. Divider line
  6. **Colour selector** — label "Colour — [name]" + swatches (§8.6)
  7. **Size selector** — label "Size — [selected]" + grid (§8.5) + OOS note
  8. **Quantity control** (§8.8)
  9. **Add to Cart button** (§8.7) — MUST be fully visible dark button
  10. **Wishlist button** (§8.9)
  11. Description text — DM Sans 11px, muted, line-height 1.7
  12. Delivery info row — 2 columns: "Free over EGP 500" (truck icon) + "14-day returns" (refresh icon)

**Interactive behaviour:**
- Clicking colour swatch updates colour label and hides OOS sizes for that colour
- Clicking size button marks it active, updates size label
- +/− quantity updates qty value AND the "Add to Cart — EGP X" button text in real time
- XS (or other OOS sizes): greyed, struck-through, not clickable

### 9.4 Wishlist Page (`pages/wishlist.html`)

**URL:** `noos.eg/pages/wishlist.html`
**Nav active link:** (none active — or Shop)
**Requires login:** Yes — redirect to index.html if no token

**Layout:** Full-width padding 22px

**Header:** "My Wishlist" (Bebas Neue 30px) + "[N] items" count (muted, right)

**Product grid:** 3 columns, gap 12px

**Wishlist card:**
- White background, border: 0.5px solid var(--border)
- Image: 3:4 aspect ratio, var(--surf) bg, centered icon
  - Red X remove button: top-right, 24×24px, var(--red) background, white ti-x icon 12px
  - Badge on image if applicable
- Info section: padding 10px 12px
  - Category label, product name, price row
  - "Add to Cart" button — full-width, ink background (§8.10)

**Empty state:** centered message "Your wishlist is empty" + "Shop Now" link

### 9.5 Profile Page (`pages/profile.html`)

**URL:** `noos.eg/pages/profile.html`
**Nav active link:** (none — logged in state)
**Requires login:** Yes

**Layout:** 2-column (160px sidebar + 1fr main)

**Left Sidebar:**
- Background: var(--surf), border-right: 0.5px solid var(--border)
- Avatar circle: 54×54px, border-radius 50%, var(--grn) bg, Bebas Neue 20px white initials
- Name: DM Sans 13px weight 500
- Email: DM Sans 10px muted
- Divider
- Nav items: My Profile (active), Orders, Wishlist, Addresses, Password
  - Active: background var(--grn-pale), color var(--grn2), border-left 2px solid var(--grn)
  - Icons: ti-user, ti-receipt, ti-heart, ti-map-pin, ti-lock
- Bottom: Sign Out — ti-logout, border-top, padding-top

**Right Main (My Profile tab):**
- Background: var(--white), padding 20px
- Title: "My Profile" — Bebas Neue 22px
- Form: 2-column row (First Name, Last Name) + Email + Phone
- "Save Changes" button — green, auto width (not full-width)
- Default Address section — surf background card showing address text

**Other tabs:** Orders (order list), Wishlist (redirect), Addresses (address cards + add new), Password (current/new/confirm form)

### 9.6 Checkout Page (`pages/checkout.html`)

**URL:** `noos.eg/pages/checkout.html`
**Nav:** Logo only — hide nav links. Show "🔒 Secure Checkout" icon+text right-side.

**Progress bar** (below nav):
- Background: var(--grn), padding 10px 22px
- Steps: 1 Shipping → 2 Review → 3 Confirm
- Active step: filled white circle with green number + white label
- Inactive: white 25% opacity circle + white 60% label
- Connector: 40px horizontal line, rgba(255,255,255,0.3)

**Layout:** 2-column (1fr main + 280px summary sidebar)

**Left — Shipping Form:**
- Title: "Shipping Details" — Bebas Neue 22px
- Fields (§8.13):
  - Row 1: Full Name + Phone Number
  - Row 2: City/Governorate (select — all Egypt governorates)
  - Row 3: Area/District (text input)
  - Row 4: Street Address (text input)
- COD banner: var(--grn-pale) background, 0.5px border var(--grn-lt)
  - ti-cash icon 18px green + "Cash on Delivery" label + "Pay when your order arrives" subtitle
- "Continue to Review" button — full-width ink

**Right — Order Summary:**
- Background: var(--surf), padding 20px
- Title: "Order Summary" — DM Sans 11px uppercase
- Cart items list: each has thumbnail (48×62px surf), name, variant label, qty, price
- Coupon row: text input + "Apply" green button (side by side, no gap)
- Totals:
  - Subtotal: EGP X
  - Shipping: "Free" in green (if > 500) or fee amount
  - Discount: "− EGP X" in red
  - Divider
  - **Total: EGP X** — 14px weight 500

### 9.7 Orders Page (`pages/orders.html`)

**URL:** `noos.eg/pages/orders.html`
**Nav active link:** (none — account area)
**Requires login:** Yes

**Header:** "My Orders" — Bebas Neue 30px

**Order cards** (stacked, gap 10px):
- Background: var(--white), border: 0.5px solid var(--border), padding 14px 16px
- Top row: order number (monospace 11px) + date + items count + total | status pill
- Product thumbnails row: 42×54px surf boxes with product icons
- Summary text: "[Product name] + N more" + payment method
- **Order progress tracker** (§8.20) — Placed → Processing → Shipped → Delivered
  - Dots and lines fill green as order progresses

**Empty state:** "You have no orders yet" + "Start Shopping" link

### 9.8 Admin Panel (`pages/admin.html`)

**URL:** `noos.eg/pages/admin.html`
**Requires admin role:** Yes — redirect if API call fails with 403

**Layout:** 2-column (148px sidebar + 1fr main)

**Sidebar:** See §8.16

**Main area background:** var(--mist)

**Dashboard Panel (default):**
- Top bar: "DASHBOARD" (Bebas Neue 24px) + date right
- Stat cards row (4 columns): Products · Orders · Revenue · Customers — see §8.15
- "Recent Orders" card (§8.17 table):
  - Columns: Order (38%), Customer (22%), Total (15%), Status (15%), Action (10%)
  - 4–5 most recent orders
  - Action: "View" button (green outline)
- Bottom 2-column grid:
  - Left: Low Stock alert card — red left border, red header, list of variant + stock count
  - Right: Quick Actions card — "Add Product" (green), "Add Category" (ink), "Create Coupon" (gold)

**Products Panel:**
- Table: Image thumb, Name, Category, Price, Stock status, Active toggle, Edit/Delete actions
- "Add Product" button in top-right
- Modal for add/edit: name, category, description, price, old price, badge, SKU, images upload

**Categories Panel:**
- Table: Name, Slug, Sort Order, Active, Edit/Delete
- "Add Category" button

**Variants Panel:**
- Select product first, then table of: Size, Colour, Hex, Price Adj, Stock, Edit/Delete
- "Add Variant" button

**Inventory Panel:**
- Table of all low-stock variants with restock button (opens qty input)

**Orders Panel:**
- Full orders table with status update modal
- Modal fields: Order Status (select), Payment Status (select), Admin Notes (textarea)

**Customers Panel:**
- Table: Name, Email, Phone, Orders count, Joined date, Delete button

**Coupons Panel:**
- Table: Code, Type, Value, Min Order, Used/Limit, Expires, Active toggle, Delete
- "Create Coupon" button

**Settings Panel:**
- Store name, free shipping threshold, newsletter code

### 9.9 About Page (`pages/about.html`)

**URL:** `noos.eg/pages/about.html`
**Nav active link:** About

**Sections:**

1. **Hero** — Background var(--ink2), padding 48px 32px, text-align center
   - Ghost "NOOS" — Bebas Neue 200px, rgba(255,255,255,0.02), absolute centered behind
   - Eyebrow: "Est. Cairo, 2024" — DM Sans 10px, grn, uppercase
   - Headline: "NEVER OUT OF STOCK" — Bebas Neue 52px, #fff, line-height 1
   - Body: DM Sans 13px, rgba(255,255,255,0.45), max-width 380px, centered

2. **Stats Bar** — 3-column grid, 1px border gaps, background var(--border)
   - Each cell: white bg, centered
   - Number: Bebas Neue 48px, var(--grn)
   - Label: DM Sans 10px uppercase, var(--slate)
   - Values: "3K+" Customers · "12" Categories · "27" Cities

3. **Our Story** — Background var(--mist), padding 28px 22px
   - 2-column: image placeholder left + text right
   - 2 paragraphs of brand story text

4. **The Team** — Background var(--surf), padding 28px 22px
   - "The Team" heading
   - 3-column team cards: avatar circle (var(--grn) bg + initials) + name + role

5. **Footer** — Standard footer (§8.19). Navigate column: Home, Shop, About, Contact.

### 9.10 Contact Page (`pages/contact.html`)

**URL:** `noos.eg/pages/contact.html`
**Nav active link:** Contact

**Sections:**

1. **Page Header** — Background var(--grn), padding 28px 22px, text-align center
   - "Get In Touch" — Bebas Neue 40px, #fff
   - Subtitle: "We usually reply within 2 hours on business days." — DM Sans 12px, rgba(255,255,255,0.55)

2. **Content** — 2-column grid (1fr 1fr)

   **Left — Contact Info:**
   - Background: var(--ink2), padding 32px 26px
   - Info items (icon + label + value):
     - ti-map-pin · Location · "Cairo, Egypt, Heliopolis District"
     - ti-mail · Email · "hello@noos.eg / support@noos.eg"
     - ti-phone · Phone/WhatsApp · "+20 100 000 0000"
     - ti-clock · Hours · "Sat – Thu · 10am – 8pm"
   - Icons: 18px, var(--grn)
   - Labels: DM Sans 9px, var(--grn), uppercase
   - Values: DM Sans 12px, rgba(255,255,255,0.65)
   - Bottom: social icons row (Instagram, TikTok, Facebook, WhatsApp)

   **Right — Contact Form:**
   - Background: var(--white), padding 28px 24px
   - Title: "Send a Message" — Bebas Neue 22px
   - Form fields (§8.13):
     - Row: Name + Email
     - Subject (select): Order Issue, Return Request, Product Question, Other
     - Message (textarea)
   - "Send Message" button — green (ti-send icon)

3. **Footer** — Standard footer

---

## 10. Customer Journey

### Browse → Purchase (Guest)

```
index.html → shop.html → product.html → Cart Sidebar → checkout.html → Success screen
```

### Registered Purchase

Same flow + Auth token sent → order linked to account → visible in orders.html

### Wishlist Flow

```
product.html → heart icon (requires login) → wishlist.html → Add to Cart
```

### Account Flow

```
Nav user icon → auth modal → login/register → profile.html
```

---

## 11. Admin Journey

1. Login at `index.html` with admin credentials
2. `Auth.isAdmin() === true` → Admin link appears in nav
3. Navigate to `pages/admin.html`
4. API call `GET /api/admin/stats` — redirects to index if 403
5. Sidebar navigation: grouped panels

---

## 12. MySQL Database Architecture

### Connection — `backend/config/db.js`

```js
// mysql2 promise pool — replaces mongoose connect
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true
});
module.exports = pool;
```

### Environment Variables (`backend/.env`)

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=noos_store
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=noos_super_secret_key_2025
```

---

## 13. Entity Relationship Design

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered customers and admins |
| `addresses` | User address book (extracted from embedded) |
| `categories` | Product categories with slug |
| `products` | Core product data |
| `product_variants` | Size × colour combinations per product |
| `product_images` | Gallery images per product or variant |
| `inventory` | Stock per variant |
| `orders` | Order header with shipping snapshot |
| `order_items` | Line items per order (denormalised snapshot) |
| `reviews` | Product reviews (one per user per product) |
| `wishlist` | User saved products |
| `coupons` | Discount codes |
| `coupon_usages` | Usage tracking per order |

### DDL

```sql
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(191)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  phone         VARCHAR(30),
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
);

CREATE TABLE addresses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  full_name   VARCHAR(120) NOT NULL,
  phone       VARCHAR(30),
  city        VARCHAR(100) NOT NULL,
  area        VARCHAR(100),
  address     VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20),
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

CREATE TABLE categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(120) NOT NULL UNIQUE,
  image_url  VARCHAR(500),
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_slug   (slug),
  INDEX idx_active (active)
);

CREATE TABLE products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  category_id  INT UNSIGNED NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  old_price    DECIMAL(10,2),
  sku          VARCHAR(100) UNIQUE,
  badge        ENUM('new','sale','bestseller','limited') DEFAULT NULL,
  rating       DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  is_featured  TINYINT(1) NOT NULL DEFAULT 0,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FULLTEXT idx_search (name, description, sku),
  INDEX idx_category (category_id),
  INDEX idx_active   (active),
  INDEX idx_featured (is_featured),
  INDEX idx_badge    (badge)
);

CREATE TABLE product_variants (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  size       VARCHAR(20)  NOT NULL,
  colour     VARCHAR(50)  NOT NULL,
  colour_hex VARCHAR(10),
  sku        VARCHAR(120) UNIQUE,
  price_adj  DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_variant (product_id, size, colour),
  INDEX idx_product_id (product_id)
);

CREATE TABLE product_images (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED,
  url        VARCHAR(500) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_product_id (product_id)
);

CREATE TABLE inventory (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  variant_id          INT UNSIGNED NOT NULL UNIQUE,
  stock               INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number   VARCHAR(30)  NOT NULL UNIQUE,
  user_id        INT UNSIGNED,
  guest_email    VARCHAR(191),
  guest_phone    VARCHAR(30),
  subtotal       DECIMAL(10,2) NOT NULL,
  shipping_cost  DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  discount       DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  total          DECIMAL(10,2) NOT NULL,
  coupon_code    VARCHAR(50),
  payment_method ENUM('COD') NOT NULL DEFAULT 'COD',
  payment_status ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  order_status   ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  admin_notes    TEXT,
  ship_full_name VARCHAR(120) NOT NULL,
  ship_phone     VARCHAR(30)  NOT NULL,
  ship_city      VARCHAR(100) NOT NULL,
  ship_area      VARCHAR(100),
  ship_address   VARCHAR(255) NOT NULL,
  ship_postal    VARCHAR(20),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id      (user_id),
  INDEX idx_order_status (order_status),
  INDEX idx_created_at   (created_at)
);

CREATE TABLE order_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      INT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED,
  variant_id    INT UNSIGNED,
  product_name  VARCHAR(255) NOT NULL,
  variant_label VARCHAR(80)  NOT NULL,
  image_url     VARCHAR(500),
  unit_price    DECIMAL(10,2) NOT NULL,
  quantity      INT UNSIGNED  NOT NULL,
  line_total    DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id)
);

CREATE TABLE reviews (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  rating     TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      VARCHAR(150),
  body       TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  UNIQUE KEY uq_user_product (user_id, product_id),
  INDEX idx_product_id (product_id)
);

CREATE TABLE wishlist (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_product (user_id, product_id)
);

CREATE TABLE coupons (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(50)  NOT NULL UNIQUE,
  discount_type   ENUM('percentage','fixed') NOT NULL,
  discount_value  DECIMAL(8,2) NOT NULL,
  min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  usage_limit     INT UNSIGNED,
  usage_count     INT UNSIGNED NOT NULL DEFAULT 0,
  active          TINYINT(1)   NOT NULL DEFAULT 1,
  expires_at      DATETIME,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code   (code),
  INDEX idx_active (active)
);

CREATE TABLE coupon_usages (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id INT UNSIGNED NOT NULL,
  user_id   INT UNSIGNED,
  order_id  INT UNSIGNED NOT NULL,
  used_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
  FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE
);
```

---

## 14. Product Management Structure

### Size System

| Category | Sizes |
|----------|-------|
| Tops (T-Shirts, Shirts, Polo, Hoodies, Sweatshirts, Knitwear, Jackets) | XS, S, M, L, XL, XXL |
| Bottoms (Jeans, Trousers, Chinos) | 28, 30, 32, 34, 36, 38 |
| Accessories | One Size, S/M, L/XL |

### Colour System

Standard colours offered: Black, White, Off White, Forest Green, Navy, Camel, Olive, Slate Grey, Burgundy, Khaki

Each variant stores: `colour` (display name) + `colour_hex` (CSS hex for swatch)

### Badge System

| Badge | When to use |
|-------|-------------|
| `new` | Product added in last 30 days |
| `bestseller` | High order volume |
| `sale` | `old_price > price` |
| `limited` | Low overall stock across all variants |

---

## 15. Inventory Management Structure

- Stock tracked per variant (`inventory` table) — NOT per product
- A product is "in stock" if ≥ 1 active variant has `stock > 0`
- Low stock fires when `stock <= low_stock_threshold` (default 5)

### Stock Deduction (Order Creation)

```sql
-- Row-level lock per variant
SELECT stock FROM inventory WHERE variant_id = ? FOR UPDATE;
-- If stock < qty → rollback, return 400
UPDATE inventory SET stock = stock - ? WHERE variant_id = ?;
-- Commit after all items pass
```

### Restock

```sql
UPDATE inventory SET stock = stock + ? WHERE variant_id = ?;
```

---

## 16. Order Management Flow

### Status Lifecycle

```
pending → processing → shipped → delivered
        ↘ cancelled (before shipped)
```

### Order Number Format

`NOOS-{YYYYMMDD}-{6-char alphanumeric}` — e.g. `NOOS-20260608-A3K9PQ`

Generated in `orderController` before INSERT.

---

## 17. Checkout Flow

1. Cart sidebar → "Proceed to Checkout"
2. `checkout.html` loads: reads cart from localStorage + loads cities from `/api/shipping/cities`
3. User fills shipping form
4. Coupon code validated via `POST /api/coupons/validate`
5. User clicks "Continue to Review" → order summary shown
6. User confirms → `POST /api/orders` with items + shippingAddress + couponCode
7. Server: validates stock → deducts inventory (transaction) → creates order → returns order number
8. Success screen: order number + "Continue Shopping"

### Free Shipping Logic

```js
// backend/config/pricing.js
const FREE_SHIPPING_THRESHOLD = 500; // EGP
```

---

## 18. Authentication Flow

### Registration

```
POST /api/auth/register { name, email, password, phone }
→ bcrypt hash (cost 12) → INSERT users → return { token, user }
```

### Login

```
POST /api/auth/login { email, password }
→ SELECT user WHERE email → bcrypt.compare → return { token, user }
```

### localStorage Keys

```
noos_token   ← JWT string
noos_user    ← JSON serialised user object
noos_cart    ← JSON serialised cart items array
```

### Cart Item Structure

```json
{
  "productId": 1,
  "variantId": 5,
  "name": "Oxford Button-Down",
  "size": "M",
  "colour": "Off White",
  "image": "/uploads/products/filename.jpg",
  "price": 599,
  "quantity": 1
}
```

---

## 19. Frontend Architecture

### Stack

Vanilla HTML + CSS + JavaScript. No framework, no build step. Express serves static files.

### File Structure

```
frontend/
├── index.html                  # Homepage
├── css/
│   ├── global.css              # All CSS variables + resets + shared components
│   ├── nav.css                 # Navbar, cart sidebar, auth modal, search overlay
│   ├── home.css                # Homepage-specific sections
│   └── shop.css                # Shop, product card, filter sidebar, PDP
├── js/
│   ├── api.js                  # All fetch calls (API object)
│   ├── utils.js                # Toast, Auth, Cart singletons
│   └── layout.js               # renderNav(), renderFooter(), renderCartSidebar(), etc.
├── pages/
│   ├── shop.html
│   ├── product.html
│   ├── checkout.html
│   ├── orders.html
│   ├── profile.html
│   ├── wishlist.html
│   ├── admin.html
│   ├── about.html
│   └── contact.html
└── images/
    └── products/               # Legacy/seeded product images
```

### Global Singletons (`js/utils.js`)

| Singleton | Changes from DomDom |
|-----------|---------------------|
| `Toast` | No change |
| `Auth` | localStorage keys: `noos_token`, `noos_user` |
| `Cart` | localStorage key: `noos_cart`; cart items include `variantId`, `size`, `colour` |

### API Module (`js/api.js`)

Base URL variable: `const API_BASE = 'http://localhost:3000/api';`

Methods to ADD (new vs DomDom):
- `API.getVariants(productId)`
- `API.createVariant(productId, data)`
- `API.updateVariant(productId, variantId, data)`
- `API.deleteVariant(productId, variantId)`
- `API.restockVariant(productId, variantId, qty)`
- `API.validateCoupon(code, subtotal)`
- `API.getCoupons()`
- `API.createCoupon(data)`
- `API.updateCoupon(id, data)`
- `API.deleteCoupon(id)`

Methods to UPDATE:
- `API.restockProduct()` → replaced by `API.restockVariant()`
- All methods: update localStorage key references from `dd_*` to `noos_*`

### CSS Architecture

All custom properties defined ONCE in `global.css :root`. Never hardcode colours in page-specific CSS files — always use variables.

---

## 20. Backend Architecture

### Folder Structure

```
backend/
├── server.js                   # Express entry point (update: mysql pool init)
├── .env                        # DB_ vars replace MONGO_URI
├── package.json                # Remove mongoose/mongodb, add mysql2
├── config/
│   ├── db.js                   # REPLACE: mysql2 pool
│   ├── pricing.js              # UPDATE: FREE_SHIPPING_THRESHOLD=500, remove MARKUP_RATE
│   ├── cities.js               # KEEP: same Egypt city list
│   └── seed.js                 # REPLACE: MySQL DDL + NOOS seed data
├── controllers/
│   ├── authController.js       # REFACTOR: mysql2 queries
│   ├── productController.js    # REFACTOR: mysql2 + variant-aware
│   ├── orderController.js      # REFACTOR: mysql2 + transaction + coupon
│   ├── reviewController.js     # REFACTOR: mysql2
│   ├── categoryController.js   # REFACTOR: mysql2 + slug util
│   ├── wishlistController.js   # REFACTOR: mysql2
│   ├── userController.js       # REFACTOR: mysql2
│   ├── variantController.js    # NEW
│   └── couponController.js     # NEW
├── middleware/
│   └── auth.js                 # KEEP: JWT logic unchanged
├── models/                     # SQL query function modules (not Mongoose schemas)
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Review.js
│   ├── Category.js
│   ├── Variant.js              # NEW
│   └── Coupon.js               # NEW
├── routes/
│   └── index.js                # UPDATE: add variant + coupon routes
└── uploads/
    └── products/               # KEEP: Multer disk storage unchanged
```

### Model Pattern (replaces Mongoose)

```js
// Each model exports plain async functions
const pool = require('../config/db');

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, phone]
  );
  return result.insertId;
}

module.exports = { findById, create };
```

---

## 21. API Architecture

All routes prefixed with `/api`.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register, returns JWT |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | User | Current user + wishlist IDs |
| PUT | `/auth/profile` | User | Update profile |
| POST | `/auth/change-password` | User | Change password |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | — | Active categories sorted |
| GET | `/categories/admin/all` | Admin | All including inactive |
| POST | `/categories` | Admin | Create (auto-slug) |
| PUT | `/categories/:id` | Admin | Update |
| DELETE | `/categories/:id` | Admin | Hard delete |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | — | Active; query: category, badge, search, sort, minPrice, maxPrice, size, colour |
| GET | `/products/admin/all` | Admin | All including inactive |
| GET | `/products/:id` | — | Single product + variants + images + 4 related |
| POST | `/products` | Admin | Create (multipart) |
| PUT | `/products/:id` | Admin | Update (multipart) |
| DELETE | `/products/:id` | Admin | Soft delete |

### Variants & Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/:id/variants` | — | Variants + stock for product |
| POST | `/products/:id/variants` | Admin | Create variant + inventory record |
| PUT | `/products/:id/variants/:vid` | Admin | Update variant |
| DELETE | `/products/:id/variants/:vid` | Admin | Delete variant |
| PATCH | `/products/:id/variants/:vid/restock` | Admin | Add stock |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders` | Optional | Place order |
| GET | `/orders` | User | My orders |
| GET | `/orders/admin/all` | Admin | All orders |
| GET | `/orders/:id` | User | Single order (owner/admin) |
| PATCH | `/orders/:id/status` | Admin | Update status + notes |

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reviews?productId=X` | — | Product reviews |
| POST | `/reviews` | User | Create (triggers rating recalculation) |
| DELETE | `/reviews/:id` | User | Delete own (admin: any) |

### Wishlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wishlist` | User | Wishlist with product data |
| POST | `/wishlist/:productId` | User | Toggle add/remove |
| DELETE | `/wishlist/:productId` | User | Remove |

### Coupons

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/coupons/validate` | — | Validate code + return discount |
| GET | `/coupons` | Admin | All coupons with usage counts |
| POST | `/coupons` | Admin | Create |
| PUT | `/coupons/:id` | Admin | Update |
| DELETE | `/coupons/:id` | Admin | Delete |

### Admin & Utilities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | Admin | Stats + recent orders + low-stock |
| GET | `/admin/users` | Admin | All non-admin users |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| GET | `/shipping/cities` | — | Egypt cities + fees |
| POST | `/newsletter/subscribe` | — | Email capture → returns NOOS10 |
| GET | `/health` | — | `{ status: 'ok', time }` |

### Response Format

```json
// Success
{ "success": true, "data": { ... } }
{ "success": true, "message": "..." }

// Error
{ "success": false, "message": "..." }
```

---

## 22. Components To Reuse

| File | Reuse Type |
|------|-----------|
| `backend/middleware/auth.js` | Full reuse — JWT has no DB dependency |
| `backend/config/cities.js` | Full reuse — same Egypt city list |
| `frontend/js/utils.js` — `Toast` | Full reuse |
| `frontend/js/utils.js` — `Auth` | Reuse; update localStorage key names |
| `frontend/js/utils.js` — `Cart` | Reuse; update key + add variantId/size/colour |
| `frontend/js/layout.js` — scroll-reveal IntersectionObserver | Full reuse |
| `frontend/js/layout.js` — `renderAuthModal()` | Full reuse |
| `frontend/js/layout.js` — `renderCartSidebar()` | Reuse; update item display |
| `pages/orders.html` | Refactor only — new order tracker widget |
| `pages/profile.html` | Refactor only — update branding |
| `pages/wishlist.html` | Refactor only — update layout |

---

## 23. Components To Refactor

| File | Changes |
|------|---------|
| `backend/config/db.js` | mysql2 pool |
| `backend/config/seed.js` | MySQL DDL + NOOS data |
| `backend/config/pricing.js` | FREE_SHIPPING_THRESHOLD=500; remove MARKUP_RATE |
| `backend/controllers/authController.js` | mysql2 queries |
| `backend/controllers/productController.js` | mysql2 + variants |
| `backend/controllers/orderController.js` | mysql2 + transaction + coupon |
| `backend/controllers/reviewController.js` | mysql2 |
| `backend/controllers/categoryController.js` | mysql2 + slug util |
| `backend/controllers/wishlistController.js` | mysql2 |
| `backend/controllers/userController.js` | mysql2 |
| `backend/routes/index.js` | Add variant + coupon routes |
| `frontend/js/api.js` | New methods + updated keys |
| `frontend/js/layout.js` | NOOS nav (Home·Shop·About·Contact), footer, cart |
| `frontend/css/global.css` | Replace ALL colour tokens; replace font imports |
| `frontend/css/home.css` | Full redesign per §9.1 |
| `frontend/css/shop.css` | Per §9.2 + §9.3 |
| `frontend/css/nav.css` | NOOS nav styles |
| `frontend/index.html` | Per §9.1 |
| `frontend/pages/shop.html` | Per §9.2 |
| `frontend/pages/product.html` | Per §9.3 — fix sizes/colours/ATC visibility |
| `frontend/pages/checkout.html` | Per §9.6 — add coupon, progress bar |
| `frontend/pages/admin.html` | Per §9.8 — new sidebar groups, stat cards, all panels |
| `frontend/pages/about.html` | Per §9.9 |
| `frontend/pages/contact.html` | Per §9.10 |

---

## 24. Components To Create

| File | Purpose |
|------|---------|
| `backend/models/Variant.js` | SQL queries for variants + inventory |
| `backend/models/Coupon.js` | SQL queries for coupons + usages |
| `backend/controllers/variantController.js` | Variant CRUD + restock |
| `backend/controllers/couponController.js` | Coupon validation + admin CRUD |
| `backend/utils/slug.js` | `generateSlug(name)` utility |
| `frontend/pages/wishlist.html` | (new file if not exists) Per §9.4 |

---

## 25. Migration Strategy

### Phase 1 — Database

1. `npm uninstall mongoose mongodb` → `npm install mysql2`
2. Create MySQL database: `CREATE DATABASE noos_store CHARACTER SET utf8mb4;`
3. Run `node config/seed.js` → creates all tables + seeds admin + categories + 3 sample products
4. Verify with `SHOW TABLES;` and `SELECT * FROM categories;`

### Phase 2 — Model Layer

Rewrite model files as SQL query function modules (see §20 pattern). Test each in isolation before wiring into controllers.

Order: User → Category → Product → Variant → Order → Review → Wishlist → Coupon

### Phase 3 — Controller Refactor

One controller at a time. Test with curl/Postman after each.

Order: auth → category → product → variant (new) → order → review → wishlist → coupon (new) → user → admin stats

### Phase 4 — Frontend

1. Update `global.css` colour tokens + fonts first (visible immediately)
2. Update `layout.js` — nav links (Home·Shop·About·Contact), footer, cart item structure
3. Update `api.js` — localStorage keys + new methods
4. Pages in order: index.html → shop → product → checkout → admin → wishlist → profile → orders → about → contact

### Key Renames (DomDom → NOOS)

| DomDom | NOOS |
|--------|------|
| `dd_token` | `noos_token` |
| `dd_user` | `noos_user` |
| `dd_cart` | `noos_cart` |
| `admin@domdom.com` | `admin@noos.eg` |
| `DOMDOM15` | `NOOS10` |
| `ORD-{base36}-{4rand}` | `NOOS-{YYYYMMDD}-{6alphanum}` |
| `FREE_SHIPPING_THRESHOLD = 3000` | `FREE_SHIPPING_THRESHOLD = 500` |
| `MARKUP_RATE = 0.05` | Removed |
| `Product.stock` (single value) | `inventory.stock` per variant |
| `Product.colors[]` (embedded) | `product_variants` + `product_images` tables |
| `User.addresses[]` (embedded) | `addresses` table |
| `Order.items[]` (embedded) | `order_items` table |

---

## 26. Development Guidelines

### Critical UI Rules (Claude Code must enforce)

1. **Size buttons:** ALWAYS white background + ink border. Never transparent, never matching background colour.
2. **Add to Cart button:** ALWAYS dark ink background + white text. Full width. Fully visible.
3. **Wishlist button:** ALWAYS has a visible border (`1px solid var(--border2)`).
4. **Nav links:** ALWAYS exactly: Home · Shop · About · Contact (in that order).
5. **Active nav link:** border-bottom 2px solid var(--grn). Never underline text-decoration.
6. **No border-radius on buttons.** Sharp edges everywhere.
7. **Font:** Bebas Neue for ALL headings/display text. DM Sans for ALL body/UI text. No exceptions.
8. **Colours:** ONLY from the CSS variable system. Never hardcode hex values in page CSS.
9. **Admin sidebar background:** `#2D4128` (var(--grn3)). Active item has green-lt left border.
10. **ATC button text:** must include the live price e.g. "Add to Cart — EGP 599". Updates on qty change.

### SQL Safety

- ALWAYS use parameterised queries: `pool.execute('SELECT ... WHERE id = ?', [id])`
- NEVER interpolate user input into SQL strings
- ORDER mutations: always use transactions for multi-table writes

### Error Handling

Every async controller function wrapped in try/catch. Errors forwarded via `next(err)`.

### Password Hashing

bcrypt, cost factor 12. Unchanged from DomDom.

### Image Upload

Multer disk storage. Max 20 images, 5MB each. Types: jpg, jpeg, png, webp, gif. Path: `backend/uploads/products/`.

### Development Startup

```bash
# Terminal 1 — MySQL
mysql -u root -p
CREATE DATABASE noos_store;
exit

# Terminal 2 — Backend
cd backend
npm install
node config/seed.js   # DDL + seed (idempotent)
npm run dev           # nodemon

# Browser
open http://localhost:3000
# Admin: admin@noos.eg / password123
```

---

## 27. Future Scalability

### Payment Gateway
Add Paymob/Fawry: expand `payment_method` ENUM + add `payment_reference` column to `orders` + webhook endpoint.

### Email Notifications
Order confirmation, shipping updates, password reset. Recommended: Postmark or Mailgun.

### Search Enhancement
Current: MySQL FULLTEXT on `products(name, description, sku)`. Future: Meilisearch (self-hosted) or Algolia.

### Cloud Image Storage
Current: Multer local disk. Future: AWS S3 or Cloudflare R2 + `multer-s3`.

### Admin Analytics Charts
Revenue by category (bar), orders over time (line), top products — all derivable from existing MySQL tables.

---

*Generated: 2026-06-08*
*This document is the single source of truth for NOOS implementation.*
*Claude Code should reference this document for every implementation decision.*
*Do not modify project files without consulting this document first.*
