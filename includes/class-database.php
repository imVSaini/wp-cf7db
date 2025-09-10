<?php
/**
 * Database
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA;

use wpdb;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Database {

	/** @var wpdb */
	private $wpdb;

	/** @var string */
	private $submissions_table;

	/** @var string */
	private $settings_table;

	/**
	 * Constructor
	 */
	public function __construct() {
		global $wpdb;
		$this->wpdb = $wpdb;
		$this->submissions_table = $wpdb->prefix . 'cf7dba_submissions';
		$this->settings_table = $wpdb->prefix . 'cf7dba_settings';
	}

	/**
	 * Save submission to database
	 *
	 * @param array $submission_data
	 * @return int|false
	 */
	public function save_submission( $submission_data ) {
		$form_id = $submission_data['form_id'] ?? 0;
		$form_title = $submission_data['form_title'] ?? '';
		$form_data = $submission_data['form_data'] ?? array();

		$submit_ip = $this->get_client_ip();
		$submit_user_id = get_current_user_id();

		$inserted = $this->wpdb->insert(
			$this->submissions_table,
			array(
				'form_id' => (string) $form_id,
				'form_title' => sanitize_text_field( $form_title ),
				'form_data' => wp_json_encode( $this->sanitize_recursive( $form_data ) ),
				'submit_ip' => $submit_ip,
				'submit_user_id' => $submit_user_id,
				'submit_datetime' => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s' )
		);

		return $inserted ? $this->wpdb->insert_id : false;
	}

	/**
	 * Get submissions with filtering and pagination
	 *
	 * @param array $args
	 * @return array
	 */
	public function get_submissions( $args = array() ) {
		$defaults = array(
			'form_id' => 0,
			'page' => 1,
			'per_page' => 15,
			'search' => '',
			'start_date' => '',
			'end_date' => '',
		);
		$args = wp_parse_args( $args, $defaults );

		$where = array();
		$params = array();

		if ( $args['form_id'] ) {
			$where[] = 'form_id = %s';
			$params[] = (string) $args['form_id'];
		}

		if ( ! empty( $args['start_date'] ) ) {
			$where[] = 'submit_datetime >= %s';
			$params[] = $args['start_date'] . ' 00:00:00';
		}

		if ( ! empty( $args['end_date'] ) ) {
			$where[] = 'submit_datetime <= %s';
			$params[] = $args['end_date'] . ' 23:59:59';
		}

		if ( ! empty( $args['search'] ) ) {
			$where[] = 'form_data LIKE %s';
			$like = '%' . $this->wpdb->esc_like( $args['search'] ) . '%';
			$params[] = $like;
		}

		$sql = 'SELECT * FROM ' . $this->submissions_table;
		if ( $where ) {
			$sql .= ' WHERE ' . implode( ' AND ', $where );
		}
		$sql .= ' ORDER BY submit_datetime DESC';

		// Debug logging for SQL query
		error_log( 'CF7DBA: SQL Query: ' . $sql );
		error_log( 'CF7DBA: Query Parameters: ' . print_r( $params, true ) );

		// Get total count for pagination
		$count_sql = 'SELECT COUNT(*) FROM ' . $this->submissions_table;
		if ( $where ) {
			$count_sql .= ' WHERE ' . implode( ' AND ', $where );
		}
		$count_prepared = $params ? $this->wpdb->prepare( $count_sql, $params ) : $count_sql;
		$total = (int) $this->wpdb->get_var( $count_prepared );

		// Add pagination (skip if per_page is -1 for getting all records)
		if ( $args['per_page'] > 0 ) {
			$offset = ( $args['page'] - 1 ) * $args['per_page'];
			$sql .= ' LIMIT %d OFFSET %d';
			$params[] = (int) $args['per_page'];
			$params[] = (int) $offset;
		}

		$prepared = $this->wpdb->prepare( $sql, $params );
		$rows = $this->wpdb->get_results( $prepared, ARRAY_A );

		$submissions = array_map( function( $row ) {
			$row['form_data'] = $row['form_data'] ? json_decode( $row['form_data'], true ) : array();
			// Debug logging
			error_log( 'CF7DBA: Submission data for ID ' . $row['id'] . ': ' . print_r( $row, true ) );
			return $row;
		}, $rows );

		// Calculate pagination metadata
		$pages = $total > 0 ? ceil( $total / $args['per_page'] ) : 1;
		$start = $total > 0 ? ( ( $args['page'] - 1 ) * $args['per_page'] ) + 1 : 0;
		$end = min( $start + $args['per_page'] - 1, $total );

		return array(
			'submissions' => $submissions,
			'total' => $total,
			'pages' => $pages,
			'current_page' => $args['page'],
			'per_page' => $args['per_page'],
			'start' => $start,
			'end' => $end,
		);
	}

	/**
	 * Count submissions
	 *
	 * @param array $args
	 * @return int
	 */
	public function count_submissions( $args = array() ) {
		$defaults = array(
			'form_id' => 0,
			'search' => '',
			'start_date' => '',
			'end_date' => '',
		);
		$args = wp_parse_args( $args, $defaults );

		$where = array();
		$params = array();

		if ( $args['form_id'] ) {
			$where[] = 'form_id = %s';
			$params[] = (string) $args['form_id'];
		}

		if ( ! empty( $args['start_date'] ) ) {
			$where[] = 'submit_datetime >= %s';
			$params[] = $args['start_date'] . ' 00:00:00';
		}

		if ( ! empty( $args['end_date'] ) ) {
			$where[] = 'submit_datetime <= %s';
			$params[] = $args['end_date'] . ' 23:59:59';
		}

		if ( ! empty( $args['search'] ) ) {
			$where[] = 'form_data LIKE %s';
			$like = '%' . $this->wpdb->esc_like( $args['search'] ) . '%';
			$params[] = $like;
		}

		$sql = 'SELECT COUNT(*) FROM ' . $this->submissions_table;
		if ( $where ) {
			$sql .= ' WHERE ' . implode( ' AND ', $where );
		}

		$prepared = $params ? $this->wpdb->prepare( $sql, $params ) : $sql;
		return (int) $this->wpdb->get_var( $prepared );
	}

	/**
	 * Delete submission
	 *
	 * @param int $submission_id
	 * @return bool
	 */
	public function delete_submission( $submission_id ) {
		// Debug logging
		error_log( 'CF7DBA: Database delete - ID: ' . $submission_id );
		error_log( 'CF7DBA: Table: ' . $this->submissions_table );
		
		$deleted = $this->wpdb->delete(
			$this->submissions_table,
			array( 'id' => (int) $submission_id ),
			array( '%d' )
		);

		error_log( 'CF7DBA: Database delete result: ' . ( $deleted ? 'SUCCESS' : 'FAILED' ) );
		error_log( 'CF7DBA: Last error: ' . $this->wpdb->last_error );

		return (bool) $deleted;
	}

	/**
	 * Get available forms
	 *
	 * @return array
	 */
	public function get_forms() {
		// First try to get forms from Contact Form 7
		if ( class_exists( 'WPCF7_ContactForm' ) ) {
			$cf7_forms = \WPCF7_ContactForm::find();
			if ( ! empty( $cf7_forms ) ) {
				$forms = array();
				foreach ( $cf7_forms as $form ) {
					$forms[] = array(
						'id' => $form->id(),
						'title' => $form->title(),
					);
				}
				return $forms;
			}
		}

		// Fallback: get forms from submissions
		$sql = 'SELECT DISTINCT form_id, form_title FROM ' . $this->submissions_table . ' ORDER BY form_title';
		$results = $this->wpdb->get_results( $sql, ARRAY_A );

		if ( empty( $results ) ) {
			return array(
				array(
					'id' => '0',
					'title' => 'No forms available',
				),
			);
		}

		return $results;
	}

	/**
	 * Get form fields for a specific form
	 *
	 * @param string $form_id
	 * @return array
	 */
	public function get_form_fields( $form_id ) {
		// First try to get fields from Contact Form 7
		if ( class_exists( 'WPCF7_ContactForm' ) ) {
			$contact_form = \WPCF7_ContactForm::get_instance( $form_id );
			if ( $contact_form ) {
				$form_content = $contact_form->prop( 'form' );
				$fields = $this->parse_cf7_form_fields( $form_content );
				if ( ! empty( $fields ) ) {
					return $fields;
				}
			}
		}

		// Fallback: extract fields from existing submissions
		$fields = $this->extract_fields_from_submissions( $form_id );
		if ( ! empty( $fields ) ) {
			return $fields;
		}

		// Last resort: return test fields for debugging
		return array(
			array(
				'name' => 'your_name',
				'type' => 'text',
				'label' => 'Your Name',
			),
			array(
				'name' => 'your_email',
				'type' => 'email',
				'label' => 'Your Email',
			),
			array(
				'name' => 'your_message',
				'type' => 'textarea',
				'label' => 'Your Message',
			),
		);
	}

	/**
	 * Parse Contact Form 7 form content to extract field definitions
	 *
	 * @param string $form_content
	 * @return array
	 */
	private function parse_cf7_form_fields( $form_content ) {
		$fields = array();

		// Log the form content for debugging
		error_log( 'CF7DBA: Parsing form content: ' . $form_content );

		// More comprehensive pattern to match CF7 field syntax
		// Matches: [text your-name], [email* your-email], [textarea your-message], etc.
		preg_match_all( '/\[([a-z*]+)\s+([a-zA-Z_][a-zA-Z0-9_-]*)/', $form_content, $matches );

		error_log( 'CF7DBA: Found ' . count( $matches[0] ) . ' field matches' );

		foreach ( $matches[0] as $index => $full_match ) {
			$field_type = $matches[1][$index];
			$field_name = $matches[2][$index];

			// Remove asterisk from field type (indicates required field)
			$field_type = str_replace( '*', '', $field_type );

			// Skip submit buttons and other non-input fields
			if ( in_array( $field_type, array( 'submit', 'button', 'reset', 'acceptance' ) ) ) {
				continue;
			}

			$field_data = array(
				'name' => $field_name,
				'type' => $this->map_cf7_field_type( $field_type ),
				'label' => ucwords( str_replace( array( '_', '-' ), ' ', $field_name ) ),
			);

			$fields[] = $field_data;
			error_log( 'CF7DBA: Added field: ' . print_r( $field_data, true ) );
		}

		// If no fields found with the main pattern, try alternative patterns
		if ( empty( $fields ) ) {
			// Try pattern for fields with name attribute: [text name="your-name"]
			preg_match_all( '/\[([a-z*]+)[^\]]*name=["\']([^"\']+)["\'][^\]]*\]/', $form_content, $alt_matches );
			
			foreach ( $alt_matches[0] as $index => $full_match ) {
				$field_type = $alt_matches[1][$index];
				$field_name = $alt_matches[2][$index];

				// Remove asterisk from field type
				$field_type = str_replace( '*', '', $field_type );

				// Skip submit buttons and other non-input fields
				if ( in_array( $field_type, array( 'submit', 'button', 'reset', 'acceptance' ) ) ) {
					continue;
				}

				$field_data = array(
					'name' => $field_name,
					'type' => $this->map_cf7_field_type( $field_type ),
					'label' => ucwords( str_replace( array( '_', '-' ), ' ', $field_name ) ),
				);

				$fields[] = $field_data;
				error_log( 'CF7DBA: Added field (alt pattern): ' . print_r( $field_data, true ) );
			}
		}

		error_log( 'CF7DBA: Total fields found: ' . count( $fields ) );
		return $fields;
	}

	/**
	 * Map Contact Form 7 field type to our field type
	 *
	 * @param string $cf7_type
	 * @return string
	 */
	private function map_cf7_field_type( $cf7_type ) {
		$type_mapping = array(
			'text' => 'text',
			'email' => 'email',
			'url' => 'url',
			'tel' => 'tel',
			'number' => 'number',
			'date' => 'date',
			'time' => 'time',
			'textarea' => 'textarea',
			'select' => 'select',
			'checkbox' => 'checkbox',
			'radio' => 'radio',
			'file' => 'file',
			'acceptance' => 'checkbox',
			'quiz' => 'text',
			'captcha' => 'text',
		);

		return isset( $type_mapping[ $cf7_type ] ) ? $type_mapping[ $cf7_type ] : 'text';
	}

	/**
	 * Extract fields from existing submissions
	 *
	 * @param string $form_id
	 * @return array
	 */
	private function extract_fields_from_submissions( $form_id ) {
		$sql = 'SELECT form_data FROM ' . $this->submissions_table . ' WHERE form_id = %d LIMIT 10';
		$prepared = $this->wpdb->prepare( $sql, $form_id );
		$results = $this->wpdb->get_results( $prepared, ARRAY_A );

		$all_fields = array();
		foreach ( $results as $row ) {
			$form_data = json_decode( $row['form_data'], true );
			if ( is_array( $form_data ) ) {
				$all_fields = array_merge( $all_fields, array_keys( $form_data ) );
			}
		}

		$unique_fields = array_unique( $all_fields );
		$fields = array();

		foreach ( $unique_fields as $field_name ) {
			$fields[] = array(
				'name' => $field_name,
				'type' => 'text',
				'label' => ucwords( str_replace( array( '_', '-' ), ' ', $field_name ) ),
			);
		}

		return $fields;
	}

	/**
	 * Sanitize data recursively
	 *
	 * @param mixed $data
	 * @return mixed
	 */
	private function sanitize_recursive( $data ) {
		if ( is_array( $data ) ) {
			$clean = array();
			foreach ( $data as $k => $v ) {
				$clean[ sanitize_key( (string) $k ) ] = $this->sanitize_recursive( $v );
			}
			return $clean;
		}
		if ( is_scalar( $data ) ) {
			return sanitize_text_field( (string) $data );
		}
		return '';
	}

	/**
	 * Get client IP address
	 *
	 * @return string|null
	 */
	private function get_client_ip() {
		$ip_keys = array(
			'HTTP_CF_CONNECTING_IP',
			'HTTP_X_FORWARDED_FOR',
			'HTTP_X_FORWARDED',
			'HTTP_X_CLUSTER_CLIENT_IP',
			'HTTP_FORWARDED_FOR',
			'HTTP_FORWARDED',
			'REMOTE_ADDR',
		);

		foreach ( $ip_keys as $key ) {
			if ( array_key_exists( $key, $_SERVER ) === true ) {
				$ip = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				if ( strpos( $ip, ',' ) !== false ) {
					$ip = explode( ',', $ip )[0];
				}
				$ip = trim( $ip );
				if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
					return $ip;
				}
			}
		}

		// Fallback to any valid IP (including private ranges)
		foreach ( $ip_keys as $key ) {
			if ( array_key_exists( $key, $_SERVER ) === true ) {
				$ip = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				if ( strpos( $ip, ',' ) !== false ) {
					$ip = explode( ',', $ip )[0];
				}
				$ip = trim( $ip );
				if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}

		return null;
	}

	/**
	 * Create settings table
	 */
	public function create_settings_table() {
		$charset_collate = $this->wpdb->get_charset_collate();

		$sql = "CREATE TABLE IF NOT EXISTS {$this->settings_table} (
			id int(11) NOT NULL AUTO_INCREMENT,
			setting_key varchar(255) NOT NULL,
			setting_value longtext,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY setting_key (setting_key)
		) $charset_collate;";

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
		dbDelta( $sql );
	}

	/**
	 * Save settings
	 *
	 * @param array $settings
	 * @return bool
	 */
	public function save_settings( $settings ) {
		$success = true;

		foreach ( $settings as $key => $value ) {
			// Store boolean values as 1 or 0 instead of serializing
			if ( is_bool( $value ) ) {
				$serialized_value = $value ? '1' : '0';
			} else {
				$serialized_value = maybe_serialize( $value );
			}

			$result = $this->wpdb->replace(
				$this->settings_table,
				array(
					'setting_key' => sanitize_key( $key ),
					'setting_value' => $serialized_value
				),
				array( '%s', '%s' )
			);

			if ( $result === false ) {
				$success = false;
				error_log( 'CF7DBA: Failed to save setting ' . $key );
			}
		}

		return $success;
	}

	/**
	 * Get settings
	 *
	 * @param array $keys Optional array of keys to retrieve
	 * @return array
	 */
	public function get_settings( $keys = array() ) {
		$where_clause = '';
		$where_values = array();

		if ( ! empty( $keys ) ) {
			$placeholders = implode( ',', array_fill( 0, count( $keys ), '%s' ) );
			$where_clause = "WHERE setting_key IN ($placeholders)";
			$where_values = array_map( 'sanitize_key', $keys );
		}

		$sql = "SELECT setting_key, setting_value FROM {$this->settings_table} $where_clause";
		
		if ( ! empty( $where_values ) ) {
			$prepared_sql = $this->wpdb->prepare( $sql, $where_values );
		} else {
			$prepared_sql = $sql;
		}

		$results = $this->wpdb->get_results( $prepared_sql, ARRAY_A );

		$settings = array();
		foreach ( $results as $row ) {
			$value = $row['setting_value'];
			
			// Handle boolean values stored as '0' or '1'
			if ( $value === '0' ) {
				$settings[ $row['setting_key'] ] = false;
			} elseif ( $value === '1' ) {
				$settings[ $row['setting_key'] ] = true;
			} else {
				$settings[ $row['setting_key'] ] = maybe_unserialize( $value );
			}
		}

		return $settings;
	}

	/**
	 * Get default settings
	 *
	 * @return array
	 */
	public function get_default_settings() {
		return array(
			// Access Control
			'editorAccess' => false,
			'authorAccess' => false,
			// Editor Permissions
			'editorAllowEdit' => false,
			'editorAllowDelete' => false,
			'editorAllowExport' => false,
			// Author Permissions
			'authorAllowEdit' => false,
			'authorAllowDelete' => false,
			'authorAllowExport' => false,
		);
	}

	/**
	 * Save column configuration for a form
	 *
	 * @param string $form_id
	 * @param array $column_config
	 * @return bool
	 */
	public function save_column_config( $form_id, $column_config ) {
		$setting_key = 'column_config_' . $form_id;
		$serialized_value = maybe_serialize( $column_config );
		
		$result = $this->wpdb->replace(
			$this->settings_table,
			array(
				'setting_key' => $setting_key,
				'setting_value' => $serialized_value,
			),
			array( '%s', '%s' )
		);

		return $result !== false;
	}

	/**
	 * Get column configuration for a form
	 *
	 * @param string $form_id
	 * @return array
	 */
	public function get_column_config( $form_id ) {
		$setting_key = 'column_config_' . $form_id;
		
		$result = $this->wpdb->get_var( $this->wpdb->prepare(
			"SELECT setting_value FROM {$this->settings_table} WHERE setting_key = %s",
			$setting_key
		) );

		if ( $result ) {
			return maybe_unserialize( $result );
		}

		return array();
	}

	/**
	 * Check if user has access to plugin
	 *
	 * @param int $user_id Optional user ID, defaults to current user
	 * @return bool
	 */
	public function user_has_access( $user_id = null ) {
		if ( $user_id === null ) {
			$user_id = get_current_user_id();
		}

		if ( ! $user_id ) {
			return false;
		}

		$user = get_user_by( 'id', $user_id );
		if ( ! $user ) {
			return false;
		}

		$settings = $this->get_settings();
		$defaults = $this->get_default_settings();
		$settings = wp_parse_args( $settings, $defaults );

		// Administrators always have access
		if ( in_array( 'administrator', $user->roles ) ) {
			return true;
		}

		// Check based on user role
		if ( in_array( 'editor', $user->roles ) && $settings['editorAccess'] ) {
			return true;
		}

		if ( in_array( 'author', $user->roles ) && $settings['authorAccess'] ) {
			return true;
		}

		return false;
	}

	/**
	 * Check if user can perform specific action
	 *
	 * @param string $action Action to check (edit, delete, export)
	 * @param int $user_id Optional user ID, defaults to current user
	 * @return bool
	 */
	public function user_can_perform_action( $action, $user_id = null ) {
		try {
			if ( $user_id === null ) {
				$user_id = get_current_user_id();
			}

			if ( ! $user_id ) {
				error_log( 'CF7DBA: No user ID for permission check' );
				return false;
			}

			$user = get_user_by( 'id', $user_id );
			if ( ! $user ) {
				error_log( 'CF7DBA: User not found for ID: ' . $user_id );
				return false;
			}

			try {
				$settings = $this->get_settings();
				error_log( 'CF7DBA: Raw settings: ' . print_r( $settings, true ) );
			} catch ( Exception $e ) {
				error_log( 'CF7DBA: Error getting settings: ' . $e->getMessage() );
				$settings = array();
			}
			
			try {
				$defaults = $this->get_default_settings();
				error_log( 'CF7DBA: Default settings: ' . print_r( $defaults, true ) );
			} catch ( Exception $e ) {
				error_log( 'CF7DBA: Error getting default settings: ' . $e->getMessage() );
				$defaults = array();
			}
			
			$settings = wp_parse_args( $settings, $defaults );

			error_log( 'CF7DBA: User roles: ' . implode( ', ', $user->roles ) );
			error_log( 'CF7DBA: Settings: ' . print_r( $settings, true ) );

			// Administrators always have all permissions
			if ( in_array( 'administrator', $user->roles ) ) {
				error_log( 'CF7DBA: Administrator has all permissions' );
				return true;
			}

			// Check based on user role and action
			if ( in_array( 'editor', $user->roles ) && $settings['editorAccess'] ) {
				$permission_key = 'editorAllow' . ucfirst( $action );
				$has_permission = isset( $settings[ $permission_key ] ) ? $settings[ $permission_key ] : false;
				error_log( 'CF7DBA: Editor permission check - Key: ' . $permission_key . ', Value: ' . ( $has_permission ? 'true' : 'false' ) );
				return $has_permission;
			}

			if ( in_array( 'author', $user->roles ) && $settings['authorAccess'] ) {
				$permission_key = 'authorAllow' . ucfirst( $action );
				$has_permission = isset( $settings[ $permission_key ] ) ? $settings[ $permission_key ] : false;
				error_log( 'CF7DBA: Author permission check - Key: ' . $permission_key . ', Value: ' . ( $has_permission ? 'true' : 'false' ) );
				return $has_permission;
			}

			error_log( 'CF7DBA: No permission found for user' );
			return false;
		} catch ( Exception $e ) {
			error_log( 'CF7DBA Permission Check Error: ' . $e->getMessage() );
			return false;
		}
	}
}