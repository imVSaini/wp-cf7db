<?php
/**
 * Submission Manager Component
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA\Components;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Submission_Manager {

	/**
	 * @var Database_Operations
	 */
	private $database_operations;

	/**
	 * Constructor
	 *
	 * @param Database_Operations $database_operations
	 */
	public function __construct( Database_Operations $database_operations ) {
		$this->database_operations = $database_operations;
	}

	/**
	 * Process and save the submission
	 *
	 * @param mixed $contact_form
	 */
	public function process_submission( $contact_form ) {
		$submission = \WPCF7_Submission::get_instance();
		
		if ( ! $submission ) {
			return;
		}

		$form_id = $contact_form->id();
		$form_title = $contact_form->title();
		$posted_data = $submission->get_posted_data();

		// Skip if submission is invalid
		if ( $submission->get_status() === 'validation_failed' ) {
			return;
		}

		// Check if we've already processed this submission (prevent duplicates)
		static $processed_submissions = array();
		$submission_hash = md5( $form_id . serialize( $posted_data ) . time() );
		if ( isset( $processed_submissions[ $submission_hash ] ) ) {
			return;
		}
		$processed_submissions[ $submission_hash ] = true;

		// Filter out Contact Form 7 internal fields
		$form_data = $this->filter_form_data( $posted_data );

		// Prepare submission data
		$submission_data = array(
			'form_id' => $form_id,
			'form_title' => $form_title,
			'form_data' => $form_data,
		);

		// Save to database
		$submission_id = $this->database_operations->save_submission( $submission_data );

		// Log if save failed
		if ( $submission_id === false ) {
			// error_log( 'CF7DBA: Failed to save submission for form ' . $form_id );
		}
	}

	/**
	 * Filter form data to remove Contact Form 7 internal fields
	 *
	 * @param array $posted_data
	 * @return array
	 */
	private function filter_form_data( $posted_data ) {
		// Fields to exclude
		$exclude_fields = array(
			'_wpcf7',
			'_wpcf7_version',
			'_wpcf7_locale',
			'_wpcf7_unit_tag',
			'_wpcf7_container_post',
			'_wpcf7_posted_data_hash',
			'_wpcf7_captcha_challenge_captcha',
			'_wpcf7_recaptcha_response',
			'_wpcf7cf_hidden_group_fields',
			'_wpcf7cf_visible_groups',
			'_wpcf7cf_options',
		);

		$filtered_data = array();

		foreach ( $posted_data as $key => $value ) {
			// Skip excluded fields
			if ( in_array( $key, $exclude_fields, true ) ) {
				continue;
			}

			// Skip fields that start with underscore (usually internal)
			if ( strpos( $key, '_' ) === 0 ) {
				continue;
			}

			// Clean and store the value
			$filtered_data[ $key ] = $this->clean_field_value( $value );
		}

		return $filtered_data;
	}

	/**
	 * Clean field value
	 *
	 * @param mixed $value
	 * @return mixed
	 */
	private function clean_field_value( $value ) {
		if ( is_array( $value ) ) {
			// Handle array values (like checkboxes)
			return array_map( 'sanitize_text_field', $value );
		}

		return sanitize_text_field( $value );
	}

	/**
	 * Get submissions with filtering and pagination
	 *
	 * @param array $args
	 * @return array
	 */
	public function get_submissions( $args = array() ) {
		return $this->database_operations->get_submissions( $args );
	}

	/**
	 * Delete submission
	 *
	 * @param int $submission_id
	 * @return bool
	 */
	public function delete_submission( $submission_id ) {
		return $this->database_operations->delete_submission( $submission_id );
	}

	/**
	 * Count submissions
	 *
	 * @param array $args
	 * @return int
	 */
	public function count_submissions( $args = array() ) {
		return $this->database_operations->count_submissions( $args );
	}

	/**
	 * Save settings
	 *
	 * @param array $settings
	 * @return bool
	 */
	public function save_settings( $settings ) {
		return $this->database_operations->save_settings( $settings );
	}

	/**
	 * Get settings
	 *
	 * @param array $keys
	 * @return array
	 */
	public function get_settings( $keys = array() ) {
		return $this->database_operations->get_settings( $keys );
	}

	/**
	 * Get default settings
	 *
	 * @return array
	 */
	public function get_default_settings() {
		return $this->database_operations->get_default_settings();
	}

	/**
	 * Check if user has access
	 *
	 * @param int $user_id
	 * @return bool
	 */
	public function user_has_access( $user_id = null ) {
		return $this->database_operations->user_has_access( $user_id );
	}

	/**
	 * Check if user can perform a specific action
	 *
	 * @param string $action
	 * @param int $user_id
	 * @return bool
	 */
	public function user_can_perform_action( $action, $user_id = null ) {
		return $this->database_operations->user_can_perform_action( $action, $user_id );
	}

	/**
	 * Save column configuration for a form
	 *
	 * @param string $form_id
	 * @param array $column_config
	 * @return bool
	 */
	public function save_column_config( $form_id, $column_config ) {
		return $this->database_operations->save_column_config( $form_id, $column_config );
	}

	/**
	 * Get column configuration for a form
	 *
	 * @param string $form_id
	 * @return array
	 */
	public function get_column_config( $form_id ) {
		return $this->database_operations->get_column_config( $form_id );
	}
}
