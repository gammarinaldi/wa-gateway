# Implementation Plan - Light Theme for Message Logger

The goal is to convert the "Live Message Logger" section in the Dashboard from its current dark theme to a light theme that follows the project's design system (Binance-inspired).

## Proposed Changes

### 1. Global Styles (`src/app/globals.css`)
- Add a `.light-section` class that provides the same spacing and structure as `.dark-section` but with a light background and appropriate borders.
- Ensure consistency with the `DESIGN.md` tokens.

### 2. Dashboard Component (`src/components/Dashboard.tsx`)
- Replace the `dark-section` class with `light-section`.
- Update the heading color from `white` to `var(--ink)`.
- Replace the `dark-card` class with the standard `card` class.
- Remove hardcoded yellow colors from message content for better readability on light backgrounds.
- Keep the message name as Binance Yellow (`#F0B90B`) to maintain brand accent, but ensure it's readable.

## Verification
- Run the application and verify the visual appearance.
- Ensure contrast ratios are acceptable for the light theme.
