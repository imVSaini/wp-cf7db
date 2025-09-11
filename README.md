# LeadSync - Contact Form 7 Database

**WordPress Plugin**: [wordpress.org/plugins/leadsync](https://wordpress.org/plugins/leadsync/)

LeadSync is a powerful Contact Form 7 Database plugin that saves Contact Form 7 submissions (including multi-step) into a custom database table with admin UI, column management, and CSV export.

## Description

LeadSync is a powerful WordPress plugin that automatically saves all Contact Form 7 form submissions to a custom database table. It provides a modern, user-friendly admin interface to view, manage, and export your form data.

### Key Features

* **Automatic Data Storage**: All Contact Form 7 submissions are automatically saved to the database
* **Modern Admin Interface**: Clean, responsive interface built with React and Ant Design
* **Advanced Filtering**: Search submissions by text, date range, or specific forms
* **Column Management**: Show/hide columns and customize table display
* **CSV Export**: Export submission data in CSV format for analysis
* **Multi-step Form Support**: Works with Contact Form 7 multi-step forms
* **Responsive Design**: Works perfectly on desktop and mobile devices
* **Security**: Built with WordPress security best practices
* **Easy Migration**: One-click migration from Contact Form CFDB7 plugin
* **Data Backup**: Automatic backup before migration to ensure data safety

### Screenshots

1. **Main Dashboard**: View all form submissions in a clean, organized table
2. **Submission Details**: Click any row to view detailed submission information
3. **Column Settings**: Customize which columns to display
4. **Export Options**: Export data in CSV format
5. **Form Filtering**: Filter submissions by specific forms or date ranges
6. **Migration Wizard**: Easy step-by-step migration from CFDB7

## Installation

1. Upload the plugin files to the `/wp-content/plugins/leadsync` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Ensure Contact Form 7 is installed and activated
4. Navigate to the "LeadSync" menu in your WordPress admin to start managing submissions

## Migration from Contact Form CFDB7

If you're currently using the Contact Form CFDB7 plugin, LeadSync provides a seamless migration process to transfer all your existing form submissions.

### Quick Migration (Recommended)

1. **Install LeadSync** while keeping your CFDB7 plugin active
2. **Go to LeadSync** in your WordPress admin menu
3. **Click the Database icon** (📊) in the header to open the migration wizard
4. **Follow the 4-step process**:
   - **Check Status**: Automatically detects your CFDB7 data
   - **Backup Data**: Export your CFDB7 data as CSV backup (recommended)
   - **Migrate Data**: Transfer all submissions to LeadSync
   - **Cleanup**: Remove old CFDB7 data (optional)

### Supported CFDB7 Formats

LeadSync automatically detects and migrates from multiple CFDB7 table formats:
- `wp_db7_forms` (newer format)
- `wp_cf7dbplugin_submits` (older format)
- `wp_cf7dbplugin_forms` (alternative format)

### Migration Features

- **Zero Data Loss**: Complete preservation of all form submissions
- **Automatic Detection**: Finds your CFDB7 data automatically
- **Batch Processing**: Handles large datasets efficiently
- **Progress Tracking**: Real-time migration progress
- **Data Backup**: Optional CSV backup before migration
- **Error Recovery**: Detailed error reporting and recovery
- **Clean Migration**: Proper cleanup of old data

### What Gets Migrated

- ✅ All form submissions and their data
- ✅ Form titles and IDs
- ✅ Submission timestamps
- ✅ Field values and structure
- ✅ Multi-step form data
- ✅ Form field mappings

### After Migration

Once migration is complete, you can:
- **Deactivate CFDB7** (optional, after verifying everything works)
- **Enjoy LeadSync's modern interface** with better performance
- **Use advanced features** like column management and filtering
- **Export data** with proper column configuration

### Troubleshooting Migration

If you encounter issues during migration:

1. **Check Permissions**: Ensure you have admin access
2. **Database Space**: Verify sufficient database space
3. **Memory Limit**: Increase PHP memory limit if needed
4. **Contact Support**: Reach out with specific error messages

For detailed migration instructions, see the [Migration Guide](MIGRATION_GUIDE.md).

## Frequently Asked Questions

### Does this plugin work with Contact Form 7 multi-step forms?

Yes! The plugin fully supports Contact Form 7 multi-step forms and will save all step data.

### Can I export the submission data?

Yes, you can export all submission data in CSV format directly from the admin interface.

### Is my data secure?

Absolutely. The plugin follows WordPress security best practices and only allows access to users with appropriate permissions.

### Does this plugin slow down my website?

No, the plugin is optimized for performance and only runs when needed. Database operations are efficient and won't impact your site speed.

### Can I customize which columns are displayed?

Yes, you can show/hide columns and customize the table display through the column settings.

### Can I migrate from Contact Form CFDB7?

Yes! LeadSync includes a built-in migration wizard that automatically detects and migrates your CFDB7 data. Simply click the Database icon (📊) in the LeadSync header to start the migration process.

### Will my existing CFDB7 data be preserved during migration?

Absolutely! The migration process creates a backup of your CFDB7 data before migration and preserves all your existing submissions. You can also export a CSV backup manually before starting the migration.

### What happens to my CFDB7 plugin after migration?

After successful migration, you can safely deactivate the CFDB7 plugin. Your data will be fully accessible through LeadSync's modern interface. The migration wizard also includes an optional cleanup step to remove old CFDB7 data.

### Does migration work with all CFDB7 table formats?

Yes! LeadSync automatically detects and migrates from multiple CFDB7 table formats including `wp_db7_forms`, `wp_cf7dbplugin_submits`, and `wp_cf7dbplugin_forms`.

## Screenshots

*Screenshots will be added to show the admin interface, submission details, and export functionality.*

## Changelog

### 1.0.0
* Initial release
* Automatic Contact Form 7 submission storage
* Modern React admin interface
* Column management and customization
* CSV export functionality
* Multi-step form support
* Responsive design
* Security and performance optimizations
* **Migration from Contact Form CFDB7**: One-click migration wizard
* **Data Backup**: Automatic backup before migration
* **Multi-format Support**: Supports all CFDB7 table formats
* **Batch Processing**: Efficient migration of large datasets
* **Progress Tracking**: Real-time migration progress
* **Error Recovery**: Comprehensive error handling and reporting

## Upgrade Notice

### 1.0.0
First release of LeadSync. Install to start saving and managing your Contact Form 7 submissions. If you're currently using Contact Form CFDB7, use the built-in migration wizard to transfer all your existing data seamlessly.

## Support

For support, feature requests, or bug reports, please visit the plugin support forum or contact the developer.

## Privacy Policy

This plugin stores form submission data in your WordPress database. No data is sent to external servers. You are responsible for ensuring compliance with applicable privacy laws and regulations.
