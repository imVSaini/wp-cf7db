# Contact Form 7 Database

A comprehensive WordPress plugin for managing Contact Form 7 submissions with a modern React admin interface built using Ant Design.

## Features

- 🎯 **Modern Admin Interface**: Built with React and Ant Design for a professional, responsive user experience
- 📊 **Data Management**: View, search, filter, and manage all Contact Form 7 submissions
- 🔍 **Advanced Filtering**: Search by text, filter by date ranges, and select specific forms
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚙️ **Customizable**: Configurable table columns and display settings
- 📤 **Export Functionality**: Download submission data in various formats
- 🗄️ **Database Integration**: Automatic saving of all form submissions
- 🔒 **Security**: WordPress nonce verification and capability checks

## Screenshots

The plugin provides a clean, modern interface that matches the design specifications exactly:

- **Header Bar**: Form selector, search, date range picker, and view toggles
- **Data Table**: Expandable rows with submission details, pagination, and bulk actions
- **Settings Modals**: Column visibility and table configuration options
- **Detail Views**: Full submission information with edit/view/delete actions

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Components**: Ant Design 5.x
- **Build System**: Vite
- **Linting**: ESLint with TypeScript rules
- **Backend**: PHP 8.0+ (WordPress)
- **Database**: MySQL (WordPress native)

## Requirements

- WordPress 5.0+
- PHP 8.0+
- Contact Form 7 plugin
- Node.js 16+ (for development)
- pnpm (recommended) or npm

## Installation

### Production Installation

1. Download the latest plugin zip file from the releases
2. Upload and install the plugin through WordPress Admin → Plugins → Add New → Upload Plugin
3. Activate the plugin
4. Access the plugin from the main admin menu: "CF7 Database"

### Development Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd contact-form-7-database
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the React application:
   ```bash
   pnpm build
   ```

4. Copy the plugin files to your WordPress development environment

## Development

### Project Structure

```
contact-form-7-database/
├── src/                    # React source code
│   ├── components/        # React components
│   ├── styles/           # CSS styles
│   ├── types/            # TypeScript type definitions
│   └── admin.tsx         # Main React entry point
├── includes/              # PHP backend classes
│   ├── Plugin.php        # Main plugin class
│   └── Database.php      # Database operations
├── build/                 # Built assets (generated)
├── scripts/               # Build scripts
├── contact-form-7-database.php  # Main plugin file
├── package.json           # Node.js dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Available Scripts

- **`pnpm dev`**: Start development server with hot reload
- **`pnpm build`**: Build React app for production
- **`pnpm lint`**: Run ESLint checks
- **`pnpm lint:fix`**: Fix ESLint issues automatically
- **`pnpm build:plugin`**: Create production-ready plugin zip file
- **`pnpm type-check`**: Run TypeScript type checking

### Development Workflow

1. **Start Development**:
   ```bash
   pnpm dev
   ```
   This starts the Vite dev server with hot reload for the React app.

2. **Build for Production**:
   ```bash
   pnpm build
   ```
   This builds the React app and outputs to the `build/` directory.

3. **Create Plugin Package**:
   ```bash
   pnpm build:plugin
   ```
   This creates a production-ready `.zip` file in the `dist/` directory.

### Code Quality

The project uses ESLint with TypeScript rules to maintain code quality:

```bash
# Check for issues
pnpm lint

# Fix issues automatically
pnpm lint:fix

# Type checking
pnpm type-check
```

## Configuration

### WordPress Admin Menu

The plugin automatically adds a menu item under the main WordPress admin menu. The menu is accessible to users with the `manage_options` capability.

### Database Tables

The plugin creates a custom table `wp_cf7db_submissions` to store form submissions. The table structure includes:

- `id`: Unique submission ID
- `form_id`: Contact Form 7 form ID
- `form_data`: JSON-encoded form submission data
- `files`: JSON-encoded file uploads
- `ip_address`: Submitter's IP address
- `user_id`: WordPress user ID (if logged in)
- `created_at`: Submission timestamp

### Hooks and Filters

The plugin provides several WordPress hooks for customization:

```php
// Modify submission data before saving
add_filter('cf7db_submission_data', function($data, $form_id) {
    // Modify $data as needed
    return $data;
}, 10, 2);

// Custom action after submission is saved
add_action('cf7db_submission_saved', function($submission_id, $form_id, $data) {
    // Custom logic here
}, 10, 3);
```

## API Endpoints

The plugin provides AJAX endpoints for the React frontend:

- `cf7db_get_submissions`: Retrieve submissions with filtering and pagination
- `cf7db_delete_submission`: Delete a specific submission
- `cf7db_get_forms`: Get list of available Contact Form 7 forms

## Styling

The plugin uses a combination of Ant Design components and custom CSS to achieve the exact design specifications. The main styles are in `src/styles/admin.css` and follow these design principles:

- Clean, modern interface with subtle shadows and borders
- Consistent spacing using 8px grid system
- Blue accent color (#1890ff) for primary actions
- Light gray backgrounds (#f5f5f5) for content areas
- Responsive design that works on all screen sizes

## Building for Production

To create a production-ready plugin:

1. Ensure all dependencies are installed:
   ```bash
   pnpm install
   ```

2. Build the React application:
   ```bash
   pnpm build
   ```

3. Create the plugin package:
   ```bash
   pnpm build:plugin
   ```

The resulting zip file in the `plugin/` directory can be uploaded directly to any WordPress site.

## Troubleshooting

### Common Issues

1. **Plugin not activating**: Ensure Contact Form 7 is installed and activated
2. **Assets not loading**: Check that the `build/` directory exists and contains built files
3. **Database errors**: Verify PHP 8.0+ and MySQL compatibility
4. **Build failures**: Ensure Node.js 16+ and pnpm are installed

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This plugin is licensed under the GPL v2 or later.

## Support

For support and questions:

- Create an issue on GitHub
- Check the WordPress plugin repository
- Review the documentation

## Changelog

### 1.0.0
- Initial release
- React admin interface with Ant Design
- Contact Form 7 integration
- Database management system
- Export functionality
- Responsive design
- TypeScript support

## Credits

- Built with [React](https://reactjs.org/)
- UI components from [Ant Design](https://ant.design/)
- Build system powered by [Vite](https://vitejs.dev/)
- WordPress integration following best practices
