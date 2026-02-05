# Issues Log

Date: 2026-02-03

## Active Issues
*None.*

## Resolved Issues

### 1. Services Dropdown Auto-hides
- **Status:** Fixed
- **Description:** The dropdown menu for "Services" auto-hid unexpectedly.
- **Resolution:** Adjusted CSS/Layout to ensure the hover area is continuous.

### 2. Contact Page Dropdown Visual Bug
- **Status:** Fixed
- **Description:** "Service Interest" dropdown was transparent/unreadable.
- **Resolution:** Fixed background color for dark mode compatibility.

### 3. Analytics/History Access Denied
- **Status:** Fixed
- **Description:** User reported access errors.
- **Resolution:** Permissions/Access control fixed.

### 4. User History Visibility
- **Status:** Fixed
- **Description:** User history was not displaying correctly.
- **Resolution:** Implemented/Fixed user history view.

### 5. AI Assistant Config Error
- **Status:** Fixed
- **Description:** Gemini API 404 error (`models/gemini-1.5-flash` not found).
- **Resolution:** Updated model configuration to a supported version/structure.

### 8. Quote Management Implementation
- **Status:** Implemented
- **Description:** Quotes page was a placeholder. Required saving, editing, and customer viewing of quotes.
- **Resolution:**
    - Created `quotations` table in database.
    - Implemented Admin Quote Manager (`src/app/management/admin/quotes/page.tsx`).
    - Implemented Quote saving logic.
    - Added Customer Quote view.

### 9. Custom Setups Color Error
- **Status:** Fixed
- **Description:** White card background on dark Admin theme in `price-manager.tsx`.
- **Resolution:** Updated `price-manager.tsx` to use dark-theme compatible classes (`bg-card`, `text-foreground`, `border-border`).

### 10. Hero Banner Implementation
- **Status:** Implemented
- **Description:** Hero Banners were requested for Home, Services, Store/Products, Innovations, and Offers pages.
- **Resolution:**
    - Updated `HeroCarousel` component to support content mapping for all 5 pages.
    - Added "Innovations" tab to Admin Hero Banner Manager.
    - Added "Custom HTML Overlay" feature for banners.
    - Integrated `HeroCarousel` component into:
        - `src/components/home-page.tsx`
        - `src/components/services-page.tsx`
        - `src/components/offers-page.tsx`
        - `src/components/products/ShopPageContent.tsx`
        - `src/components/innovation-page.tsx`

