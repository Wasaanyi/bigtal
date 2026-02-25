# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start Vite dev server + Electron concurrently
npm run dev:vite         # Vite only (port 5173)
npm run dev:electron     # Electron only (waits for Vite, compiles TS)
npm run build            # Production build (Vite + main process)
npm run package:win      # Build + create Windows NSIS installer
npm run package:mac      # Build + create macOS DMG
npm run package:linux    # Build + create Linux AppImage/DEB
```

No test or lint scripts are currently configured.

## Architecture Overview

Bigtal is an Electron desktop app for small business management, targeting African shop owners. It uses a three-process architecture:

### Process Model

1. **Main Process** (`src/main/`) - Node.js/CommonJS
   - Entry: `src/main/index.ts`
   - Creates BrowserWindow, manages app lifecycle
   - Initializes PGlite database and runs migrations
   - Registers IPC handlers for all backend operations

2. **Preload Script** (`src/preload/index.ts`) - Bridge Layer
   - Exposes `window.api` via contextBridge
   - Security boundary between renderer and main process

3. **Renderer Process** (`src/renderer/`) - React/TypeScript
   - Entry: `src/renderer/main.tsx`
   - Sandboxed Chromium environment, no direct Node.js access
   - Calls `window.api.*` methods for all backend operations

### Data Flow

```
React Component → Zustand Store → window.api.* → IPC Channel → Repository/Service → PGlite
```

### Key Directories

- `src/main/database/` - PGlite connection wrapper, migrations, and repositories
- `src/main/services/` - Business logic services (emailService, exportService, recoveryService, businessService)
- `src/main/ipc/` - IPC handlers organized by domain
- `src/renderer/components/ui/` - Reusable UI components (Button, Card, Input, Modal, Drawer, Table, Select, TextArea)
- `src/renderer/components/layout/` - Sidebar, Header, MainLayout
- `src/renderer/pages/` - Page components (Login, Dashboard, Invoices, Products, Expenses, Customers, Suppliers, Users, Settings)
- `src/renderer/store/` - Zustand stores (authStore, dataStore, uiStore)
- `src/shared/` - Types and constants shared between main and renderer

### Database

- **PGlite** - PostgreSQL-compatible embedded database (offline-first)
- `DatabaseWrapper` class adapts PGlite API and converts `?` placeholders to `$n`
- Migrations tracked in `_migrations` table
- Tables: users, currencies, customers, suppliers, product_categories, products, invoices, invoice_items, expenses, donations, app_settings

### State Management

- **Zustand** with persistence middleware
- Separate stores: `authStore` (session), `dataStore` (entities), `uiStore` (UI state/notifications)

### IPC Channels

35+ channels organized by domain:
- Auth: `auth:login`, `auth:logout`, `auth:get-session`
- CRUD: `{entity}:create`, `{entity}:list`, `{entity}:update`, `{entity}:delete`
- Dashboard: `dashboard:stats`
- Recovery: `recovery:exists`, `recovery:setup`, `recovery:validate`, `recovery:reset-admin`
- Export: `export:csv`
- Email: `email:get-config`, `email:save-config`, `email:test-connection`, `email:send-invoice`
- Business: `business:get-info`, `business:save-info`, `business:upload-logo`, `business:get-logo`
- Constants defined in `src/shared/constants.ts`

### Services

- `emailService` - SMTP configuration, email sending (requires nodemailer)
- `exportService` - CSV export with file dialog
- `recoveryService` - Admin password recovery key system
- `businessService` - Business info storage and logo management

## Configuration Files

- `vite.config.ts` - Path aliases (`@`, `@shared`, `@renderer`), dev server port 5173
- `tsconfig.json` - Renderer TypeScript (ES2022, strict)
- `tsconfig.main.json` - Main process TypeScript (CommonJS output to `dist/main`)
- `electron-builder.json` - Packaging config (NSIS, DMG, AppImage)

## Authentication

- Default credentials: `admin`/`admin` (Admin), `attendant`/`1234` (Attendant)
- Passwords hashed with bcryptjs
- Session stored in main process memory
- Role-based route protection (Admin has full access, Attendant limited to invoices)
- Recovery key system for admin password reset

## Key Patterns

- Context isolation enabled, Node integration disabled for security
- Repository pattern for data access
- Service pattern for business logic
- Multi-currency support (8 African currencies seeded)
- Invoice status workflow: draft → sent → paid/overdue
- Soft-delete pattern for customers, suppliers, products (is_active flag)

## UI Patterns

- Dark/Light mode support via Tailwind CSS
- Button variants: primary, secondary, ghost, danger
- Consistent table action buttons with icons (Edit, Delete, Print)
- Drawer for create/edit forms
- Modal for confirmations and simple forms
- Toast notifications via uiStore

## Settings Page

The Settings page (`src/renderer/pages/SettingsPage.tsx`) includes:
1. **Business Information** - Name, address, phone, email, logo upload
2. **Email Configuration** - SMTP settings for sending invoices
3. **SMTP Help** - Quick reference for Gmail, Outlook, Yahoo settings

## Invoice Printing

The `InvoicePrintView` component (`src/renderer/components/InvoicePrintView.tsx`):
- Shows business logo and info in header (falls back to Bigtal branding)
- Professional invoice layout with items table
- "Generated by Bigtal" footer with small logo
- Triggered via `window.print()` with print-specific CSS classes
