<?php
/**
 * Plugin Activator
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Activator {

	/**
	 * Plugin activation
	 */
	public static function activate() {
		// Create database tables
		self::create_tables();
		
		// Set default options
		add_option( 'cf7dba_version', CF7DBA_VERSION );
		
		// Flush rewrite rules
		flush_rewrite_rules();
	}

	/**
	 * Create database tables
	 */
	private static function create_tables() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();
		
		// Create database instance to use its table creation methods
		$database = new Database();
		
		// Main submissions table
		$table_name = $wpdb->prefix . 'cf7dba_submissions';
		
		$sql = "CREATE TABLE $table_name (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			form_id varchar(20) NOT NULL,
			form_title varchar(255) NOT NULL,
			form_data longtext NOT NULL,
			submit_ip varchar(45) DEFAULT NULL,
			submit_datetime datetime DEFAULT CURRENT_TIMESTAMP,
			submit_user_id bigint(20) DEFAULT NULL,
			PRIMARY KEY (id),
			KEY form_id (form_id),
			KEY submit_datetime (submit_datetime),
			KEY submit_user_id (submit_user_id)
		) $charset_collate;";

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
		dbDelta( $sql );

		
		// Create settings table
		$database->create_settings_table();
		
		// Set default settings
		$default_settings = $database->get_default_settings();
		$database->save_settings( $default_settings );
	}

	/**
	 * Check if we need to add submit_ip column (migration)
	 */
	public static function maybe_add_submit_ip_column() {
		global $wpdb;
		
		$table_name = $wpdb->prefix . 'cf7dba_submissions';
		$column_exists = $wpdb->get_results( "SHOW COLUMNS FROM $table_name LIKE 'submit_ip'" );
		
		if ( empty( $column_exists ) ) {
			$wpdb->query( "ALTER TABLE $table_name ADD COLUMN submit_ip varchar(45) DEFAULT NULL AFTER form_data" );
		}
	}

	/**
	 * Plugin deactivation
	 */
	public static function deactivate() {
		// Flush rewrite rules
		flush_rewrite_rules();
	}

	/**
	 * Plugin uninstall
	 */
	public static function uninstall() {
		// Remove options
		delete_option( 'cf7dba_version' );
		
		// Optionally drop tables (uncomment if you want to remove data)
		// $wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}cf7dba_submissions" );
	}

}