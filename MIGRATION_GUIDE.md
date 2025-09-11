# Migration Guide: From Contact Form CFDB7 to LeadSync

This guide will help you migrate your form submissions from the popular **Contact Form CFDB7** plugin to **LeadSync**.

## 🚀 Quick Migration (Recommended)

### Step 1: Install LeadSync
1. Download and install LeadSync from the WordPress admin
2. Activate the plugin
3. Ensure Contact Form 7 is installed and active

### Step 2: Use the Built-in Migration Tool
1. Go to **LeadSync** in your WordPress admin menu
2. Click the **Database** icon (📊) in the header
3. Follow the step-by-step migration wizard:
   - **Check Status**: Automatically detects CFDB7 data
   - **Backup Data**: Export CFDB7 data as CSV backup
   - **Migrate Data**: Transfer all submissions to LeadSync
   - **Cleanup**: Remove old CFDB7 data (optional)

### Step 3: Verify Migration
1. Check that all your form submissions appear in LeadSync
2. Test the export functionality
3. Verify column configurations work correctly

## 📋 Manual Migration (Advanced)

If you prefer to migrate manually or the automatic tool doesn't work:

### Step 1: Export from CFDB7
1. Go to **CFDB7** in your WordPress admin
2. Select the form you want to export
3. Click **Export** to download CSV file
4. Repeat for each form

### Step 2: Prepare LeadSync
1. Install and activate LeadSync
2. Ensure all your Contact Form 7 forms are active
3. Note the form IDs in LeadSync

### Step 3: Import Data
1. Use the CSV import functionality in LeadSync
2. Map CFDB7 columns to LeadSync fields
3. Verify data integrity

## 🔄 Database Structure Comparison

### CFDB7 Structure
```sql
wp_cf7dbplugin_submits
├── submit_time (datetime)
├── form_name (varchar)
├── field_name (varchar)
├── field_value (text)
└── field_order (int)
```

### LeadSync Structure
```sql
wp_cf7dba_submissions
├── id (bigint, auto_increment)
├── form_id (varchar)
├── form_title (varchar)
├── form_data (longtext, JSON)
├── submit_ip (varchar)
├── submit_user_id (bigint)
└── submit_datetime (datetime)
```

## ⚠️ Important Notes

### Data Mapping
- **CFDB7** stores each field as a separate row
- **LeadSync** stores all fields as JSON in one row
- Migration automatically reconstructs the data structure

### Field Mapping
- `submit_time` → `submit_datetime`
- `form_name` → `form_title` + `form_id` (extracted from CF7)
- `field_name` + `field_value` → `form_data` (JSON)

### Missing Data
- **IP Address**: CFDB7 doesn't store IP, LeadSync will set to `null`
- **User ID**: CFDB7 doesn't store user ID, LeadSync will set to `null`

## 🛠️ Troubleshooting

### Migration Fails
1. **Check Permissions**: Ensure you have admin access
2. **Database Space**: Ensure sufficient database space
3. **Memory Limit**: Increase PHP memory limit if needed
4. **Timeout**: Large datasets may need batch processing

### Data Issues
1. **Missing Submissions**: Check CFDB7 table exists
2. **Incorrect Form IDs**: Verify Contact Form 7 forms are active
3. **Field Mapping**: Check field names match between plugins

### Performance Issues
1. **Large Datasets**: Use batch migration (100 records at a time)
2. **Server Resources**: Consider migrating during low-traffic periods
3. **Database Optimization**: Run `OPTIMIZE TABLE` after migration

## 🔧 Advanced Configuration

### Batch Size Adjustment
```php
// In Migration_Manager class
$batch_size = 50; // Reduce for slower servers
$batch_size = 200; // Increase for faster servers
```

### Custom Field Mapping
```php
// Add custom field mapping in migrate_single_cfdb7_record()
$custom_mapping = array(
    'your_old_field' => 'your_new_field',
    'another_field' => 'another_new_field'
);
```

### Data Validation
```php
// Add validation before migration
if (empty($form_data)) {
    return false; // Skip empty submissions
}
```

## 📊 Migration Statistics

After migration, you can check:
- **Total Submissions**: Count of migrated records
- **Form Distribution**: Submissions per form
- **Date Range**: Oldest to newest submission
- **Error Log**: Any failed migrations

## 🔒 Security Considerations

### Data Backup
- Always backup your database before migration
- Export CFDB7 data as CSV backup
- Test migration on staging site first

### Access Control
- Migration requires admin privileges
- CFDB7 data is not accessible to non-admin users
- LeadSync respects WordPress user roles

## 📞 Support

If you encounter issues during migration:

1. **Check Logs**: Look for error messages in migration modal
2. **Database Check**: Verify CFDB7 table exists and has data
3. **Plugin Conflict**: Deactivate other plugins temporarily
4. **Contact Support**: Reach out with specific error messages

## 🎯 Post-Migration Checklist

- [ ] All form submissions migrated successfully
- [ ] Export functionality works correctly
- [ ] Column management works as expected
- [ ] Search and filtering work properly
- [ ] Date range filtering works
- [ ] CFDB7 plugin can be safely deactivated
- [ ] Old CFDB7 data cleaned up (optional)

## 🚀 Benefits After Migration

### LeadSync Advantages
- **Modern UI**: React-based admin interface
- **Better Performance**: Optimized database queries
- **Advanced Features**: Column management, better export
- **Active Development**: Regular updates and improvements
- **Better Support**: Dedicated support and documentation

### CFDB7 Limitations
- **Outdated UI**: Basic admin interface
- **Limited Features**: Basic export only
- **Performance Issues**: Slower with large datasets
- **No Updates**: Plugin appears abandoned

---

**Ready to migrate?** Use the built-in migration tool in LeadSync for the easiest experience! 🎉
