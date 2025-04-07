# Company Design System Assets

This directory contains the design system assets for our company's branding. These assets are used by the NL2Page application to generate HTML pages that conform to our design guidelines.

## Directory Structure

- **fonts/** - Contains all company font files
- **logos/** - Contains company logo files in various formats
- **icons/** - Contains UI and feature icons
- **images/** - Contains company images, backgrounds, and photos
- **company-design-system.css** - The CSS file that defines our design system

## Using the Design System

The NL2Page application is configured to automatically include the company design system CSS in all generated HTML. The system will prioritize company-specific styles and components when generating content.

## Updating Assets

When updating or adding new assets:

1. Maintain the same directory structure
2. Use consistent naming conventions
3. Optimize all assets for web use
4. Update the CSS file if necessary to reference new assets

## Design Guidelines Reference

The design system implements the following guidelines:

### Colors
- Primary: #46af28
- Secondary: #E8C547
- Accent: #D64933
- Dark: #2F2F2F
- Light: #F5F5F5

### Typography
- Headings: Company-Sans (with Arial fallback)
- Body text: Company-Serif (with Georgia fallback)
- Font size scale: h1: 32px, h2: 24px, h3: 20px, body: 16px

### Components
The CSS includes predefined styles for common components:
- Buttons (.company-btn)
- Forms (.company-form-control, .company-label)
- Cards (.company-card)
- Header (.company-header)
- Footer (.company-footer)

For questions about the design system, contact the design team. 