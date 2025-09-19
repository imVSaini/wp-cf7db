<?php
/**
 * Migration Manager Component
 * Handles migration from contact-form-cfdb7 plugin to LeadSync
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA\Components;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Migration_Manager {

	/** @var wpdb */
	private $wpdb;

	/** @var string */
	private $submissions_table;

	/** @var string */
	private $cfdb7_table;

	/**
	 * Constructor
	 */
	public function __construct() {
		global $wpdb;
		$this->wpdb = $wpdb;
		$this->submissions_table = $wpdb->prefix . 'cf7dba_submissions';
		// Check for both possible CFDB7 table names
		$this->cfdb7_table = $this->detect_cfdb7_table();
	}

	/**
	 * Detect the correct CFDB7 table name
	 *
	 * @return string|null
	 */
	private function detect_cfdb7_table() {
		$possible_tables = array(
			$this->wpdb->prefix . 'db7_forms',        // Newer CFDB7 format
			$this->wpdb->prefix . 'cf7dbplugin_submits', // Older CFDB7 format
			$this->wpdb->prefix . 'cf7dbplugin_forms',   // Alternative format
		);

		foreach ( $possible_tables as $table ) {
			$table_exists = $this->wpdb->get_var( "SHOW TABLES LIKE '{$table}'" );
			if ( $table_exists ) {
				$count = $this->wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
				if ( $count > 0 ) {
					return $table;
				}
			}
		}

		return null;
	}

	/**
	 * Check if CFDB7 plugin data exists
	 *
	 * @return bool
	 */
	public function cfdb7_data_exists() {
		return $this->cfdb7_table !== null;
	}

	/**
	 * Get CFDB7 data count
	 *
	 * @return int
	 */
	public function get_cfdb7_data_count() {
		if ( ! $this->cfdb7_table ) {
			return 0;
		}

		return (int) $this->wpdb->get_var( "SELECT COUNT(*) FROM {$this->cfdb7_table}" );
	}

	/**
	 * Get CFDB7 table structure
	 *
	 * @return array
	 */
	public function get_cfdb7_structure() {
		$table_exists = $this->wpdb->get_var( "SHOW TABLES LIKE '{$this->cfdb7_table}'" );
		if ( ! $table_exists ) {
			return array();
		}

		return $this->wpdb->get_results( "DESCRIBE {$this->cfdb7_table}", ARRAY_A );
	}

	/**
	 * Migrate data from CFDB7 to LeadSync
	 *
	 * @param int $batch_size
	 * @param int $offset
	 * @return array
	 */
	public function migrate_cfdb7_data( $batch_size = 100, $offset = 0 ) {
		if ( ! $this->cfdb7_table ) {
			return array(
				'success' => false,
				'message' => 'CFDB7 table not found',
				'migrated' => 0,
				'total' => 0
			);
		}

		// Get total count
		$total = $this->wpdb->get_var( "SELECT COUNT(*) FROM {$this->cfdb7_table}" );

		// Get CFDB7 data in batches
		$cfdb7_data = $this->wpdb->get_results( $this->wpdb->prepare(
			"SELECT * FROM {$this->cfdb7_table} LIMIT %d OFFSET %d",
			$batch_size,
			$offset
		), ARRAY_A );

		$migrated = 0;
		$errors = array();

		foreach ( $cfdb7_data as $row ) {
			try {
				$migration_result = $this->migrate_single_cfdb7_record( $row );
				if ( $migration_result ) {
					$migrated++;
				} else {
					$record_id = $row['form_id'] ?? $row['id'] ?? 'unknown';
					$errors[] = sprintf( __( 'Failed to migrate record ID: %s', 'leadsync' ), $record_id );
				}
			} catch ( \Exception $e ) {
				$record_id = $row['form_id'] ?? $row['id'] ?? 'unknown';
				$errors[] = sprintf( __( 'Error migrating record ID: %s - %s', 'leadsync' ), $record_id, $e->getMessage() );
			}
		}

		return array(
			'success' => true,
			'migrated' => $migrated,
			'total' => (int) $total,
			'errors' => $errors,
			'has_more' => ( $offset + $batch_size ) < $total
		);
	}

	/**
	 * Migrate a single CFDB7 record to LeadSync format
	 *
	 * @param array $cfdb7_record
	 * @return bool
	 */
	private function migrate_single_cfdb7_record( $cfdb7_record ) {
		// Check if this is the wp_db7_forms table structure
		if ( strpos( $this->cfdb7_table, 'db7_forms' ) !== false ) {
			return $this->migrate_db7_forms_record( $cfdb7_record );
		}
		
		// Original CFDB7 structure (submit_time, form_name, field_name, field_value, field_order)
		$submit_time = $cfdb7_record['submit_time'] ?? '';
		$form_name = $cfdb7_record['form_name'] ?? '';
		
		// Check if this submission already exists
		$existing = $this->wpdb->get_var( $this->wpdb->prepare(
			"SELECT id FROM {$this->submissions_table} WHERE form_title = %s AND submit_datetime = %s",
			$form_name,
			$submit_time
		) );

		if ( $existing ) {
			return true; // Already migrated
		}

		// Get all records for this submission
		$submission_records = $this->wpdb->get_results( $this->wpdb->prepare(
			"SELECT field_name, field_value, field_order FROM {$this->cfdb7_table} 
			 WHERE submit_time = %s AND form_name = %s 
			 ORDER BY field_order",
			$submit_time,
			$form_name
		), ARRAY_A );

		// Reconstruct form data
		$form_data = array();
		foreach ( $submission_records as $record ) {
			$field_name = $record['field_name'];
			$field_value = $record['field_value'];
			
			// Handle array fields (like checkboxes)
			if ( isset( $form_data[ $field_name ] ) ) {
				if ( ! is_array( $form_data[ $field_name ] ) ) {
					$form_data[ $field_name ] = array( $form_data[ $field_name ] );
				}
				$form_data[ $field_name ][] = $field_value;
			} else {
				$form_data[ $field_name ] = $field_value;
			}
		}

		// Extract form ID from form name (CFDB7 stores form name, we need form ID)
		$form_id = $this->extract_form_id_from_name( $form_name );

		// Insert into LeadSync table
		$inserted = $this->wpdb->insert(
			$this->submissions_table,
			array(
				'form_id' => (string) $form_id,
				'form_title' => sanitize_text_field( $form_name ),
				'form_data' => wp_json_encode( $this->sanitize_recursive( $form_data ) ),
				'submit_ip' => null, // CFDB7 doesn't store IP
				'submit_user_id' => null, // CFDB7 doesn't store user ID
				'submit_datetime' => $submit_time,
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s' )
		);

		return $inserted !== false;
	}

	/**
	 * Migrate a record from wp_db7_forms table
	 *
	 * @param array $db7_record
	 * @return bool
	 */
	private function migrate_db7_forms_record( $db7_record ) {
		$form_id = $db7_record['form_post_id'] ?? '';
		$form_value = $db7_record['form_value'] ?? '';
		$form_date = $db7_record['form_date'] ?? '';
		
		// Check if this submission already exists
		$existing = $this->wpdb->get_var( $this->wpdb->prepare(
			"SELECT id FROM {$this->submissions_table} WHERE form_id = %s AND submit_datetime = %s",
			$form_id,
			$form_date
		) );

		if ( $existing ) {
			return true; // Already migrated
		}

		// Parse the form_value (it's stored as serialized data)
		$form_data = $this->parse_db7_form_value( $form_value );
		
		// Get form title from Contact Form 7
		$form_title = $this->get_form_title_by_id( $form_id );

		// Insert into LeadSync table
		$inserted = $this->wpdb->insert(
			$this->submissions_table,
			array(
				'form_id' => (string) $form_id,
				'form_title' => sanitize_text_field( $form_title ),
				'form_data' => wp_json_encode( $this->sanitize_recursive( $form_data ) ),
				'submit_ip' => null, // DB7 doesn't store IP
				'submit_user_id' => null, // DB7 doesn't store user ID
				'submit_datetime' => $form_date,
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s' )
		);

		return $inserted !== false;
	}

	/**
	 * Parse the form_value from wp_db7_forms table
	 *
	 * @param string $form_value
	 * @return array
	 */
	private function parse_db7_form_value( $form_value ) {
		// Try to unserialize the data
		$unserialized = maybe_unserialize( $form_value );
		
		if ( is_array( $unserialized ) ) {
			return $unserialized;
		}
		
		// If unserialize failed, try to parse as JSON
		$json_decoded = json_decode( $form_value, true );
		if ( is_array( $json_decoded ) ) {
			return $json_decoded;
		}
		
		// If both failed, return empty array
		return array();
	}

	/**
	 * Get form title by form ID
	 *
	 * @param string $form_id
	 * @return string
	 */
	private function get_form_title_by_id( $form_id ) {
		$form = get_post( $form_id );
		if ( $form && $form->post_type === 'wpcf7_contact_form' ) {
			return $form->post_title;
		}
		
		return sprintf( __( 'Form ID: %s', 'leadsync' ), $form_id );
	}

	/**
	 * Extract form ID from form name
	 *
	 * @param string $form_name
	 * @return string
	 */
	private function extract_form_id_from_name( $form_name ) {
		// Try to find Contact Form 7 form by title
		$form = get_page_by_title( $form_name, OBJECT, 'wpcf7_contact_form' );
		if ( $form ) {
			return (string) $form->ID;
		}

		// Fallback: use form name as ID
		return sanitize_text_field( $form_name );
	}

	/**
	 * Sanitize data recursively
	 *
	 * @param mixed $data
	 * @return mixed
	 */
	private function sanitize_recursive( $data ) {
		if ( is_array( $data ) ) {
			return array_map( array( $this, 'sanitize_recursive' ), $data );
		}
		return sanitize_text_field( $data );
	}

	/**
	 * Get migration progress
	 *
	 * @return array
	 */
	public function get_migration_progress() {
		$cfdb7_count = $this->get_cfdb7_data_count();
		$leadsync_count = $this->wpdb->get_var( "SELECT COUNT(*) FROM {$this->submissions_table}" );
		
		return array(
			'cfdb7_total' => $cfdb7_count,
			'leadsync_total' => (int) $leadsync_count,
			'progress_percentage' => $cfdb7_count > 0 ? round( ( $leadsync_count / $cfdb7_count ) * 100, 2 ) : 100
		);
	}

	/**
	 * Get debug information about detected tables
	 *
	 * @return array
	 */
	public function get_debug_info() {
		$possible_tables = array(
			$this->wpdb->prefix . 'db7_forms',
			$this->wpdb->prefix . 'cf7dbplugin_submits',
			$this->wpdb->prefix . 'cf7dbplugin_forms',
		);

		$debug_info = array();
		foreach ( $possible_tables as $table ) {
			$table_exists = $this->wpdb->get_var( "SHOW TABLES LIKE '{$table}'" );
			$count = 0;
			$structure = array();
			
			if ( $table_exists ) {
				$count = (int) $this->wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
				$structure = $this->wpdb->get_results( "DESCRIBE {$table}", ARRAY_A );
			}
			
			$debug_info[] = array(
				'table_name' => $table,
				'exists' => (bool) $table_exists,
				'count' => $count,
				'structure' => $structure,
				'is_detected' => $table === $this->cfdb7_table
			);
		}

		return array(
			'detected_table' => $this->cfdb7_table,
			'tables' => $debug_info
		);
	}

	/**
	 * Clean up CFDB7 data after successful migration
	 *
	 * @return bool
	 */
	public function cleanup_cfdb7_data() {
		// Only clean up if migration is complete
		$progress = $this->get_migration_progress();
		if ( $progress['progress_percentage'] < 100 ) {
			return false;
		}

		// Drop CFDB7 table
		$result = $this->wpdb->query( "DROP TABLE IF EXISTS {$this->cfdb7_table}" );
		
		// Also clean up CFDB7 options
		delete_option( 'cf7-database-plugin' );
		delete_option( 'cf7-database-plugin-version' );
		
		return $result !== false;
	}

	/**
	 * Export CFDB7 data to CSV for backup
	 *
	 * @return array|false
	 */
	public function export_cfdb7_data_to_csv() {
		$table_exists = $this->wpdb->get_var( "SHOW TABLES LIKE '{$this->cfdb7_table}'" );
		if ( ! $table_exists ) {
			return false;
		}

		$data = $this->wpdb->get_results( "SELECT * FROM {$this->cfdb7_table}", ARRAY_A );
		if ( empty( $data ) ) {
			return false;
		}

		$filename = 'cfdb7-backup-' . date( 'Y-m-d-H-i-s' ) . '.csv';
		$upload_dir = wp_upload_dir();
		$filepath = $upload_dir['path'] . '/' . $filename;
		$file_url = $upload_dir['url'] . '/' . $filename;

		$file = fopen( $filepath, 'w' );
		if ( ! $file ) {
			return false;
		}

		// Write headers
		fputcsv( $file, array_keys( $data[0] ) );

		// Write data
		foreach ( $data as $row ) {
			fputcsv( $file, $row );
		}

		fclose( $file );

		return array(
			'filepath' => $filepath,
			'file_url' => $file_url,
			'filename' => $filename
		);
	}
}
