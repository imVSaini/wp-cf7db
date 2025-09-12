<?php
/**
 * Contact Form 7 Hooks
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CF7_Hooks {

	/**
	 * @var Database
	 */
	private $database;

	/**
	 * Constructor
	 *
	 * @param Database $database
	 */
	public function __construct( Database $database ) {
		$this->database = $database;

		// Hook into Contact Form 7 submission with higher priority
		add_action( 'wpcf7_mail_sent', array( $this, 'save_submission' ), 10 );
		add_action( 'wpcf7_mail_failed', array( $this, 'save_submission' ), 10 );
		
		// Hook into Contact Form 7 before send mail (for multi-step forms and when mail is disabled)
		add_action( 'wpcf7_before_send_mail', array( $this, 'save_submission_before_mail' ), 10 );
		
		// Additional hook for when mail is completely disabled
		add_action( 'wpcf7_submit', array( $this, 'save_submission_on_submit' ), 10 );
	}

	/**
	 * Save submission after mail is sent
	 *
	 * @param mixed $contact_form
	 */
	public function save_submission( $contact_form ) {
		// error_log( 'CF7DBA: wpcf7_mail_sent hook triggered for form ' . $contact_form->id() );
		$this->process_submission( $contact_form );
	}

	/**
	 * Save submission before mail is sent (for multi-step forms)
	 *
	 * @param mixed $contact_form
	 */
	public function save_submission_before_mail( $contact_form ) {
		// error_log( 'CF7DBA: wpcf7_before_send_mail hook triggered for form ' . $contact_form->id() );
		$submission = \WPCF7_Submission::get_instance();
		if ( $submission ) {
			// Save regardless of mail status for better data capture
			$this->process_submission( $contact_form );
		}
	}

	/**
	 * Save submission on form submit (additional hook)
	 *
	 * @param mixed $contact_form
	 */
	public function save_submission_on_submit( $contact_form ) {
		// error_log( 'CF7DBA: wpcf7_submit hook triggered for form ' . $contact_form->id() );
		$submission = \WPCF7_Submission::get_instance();
		if ( $submission && $submission->get_status() !== 'validation_failed' ) {
			$this->process_submission( $contact_form );
		}
	}

	/**
	 * Process and save the submission
	 *
	 * @param mixed $contact_form
	 */
	private function process_submission( $contact_form ) {
		$submission = \WPCF7_Submission::get_instance();
		
		if ( ! $submission ) {
			error_log( 'CF7DBA: No submission instance available' );
			return;
		}

		$form_id = $contact_form->id();
		$form_title = $contact_form->title();
		$posted_data = $submission->get_posted_data();

		// Skip if submission is invalid
		if ( $submission->get_status() === 'validation_failed' ) {
			error_log( 'CF7DBA: Skipping submission due to validation failure' );
			return;
		}

		// Check if we've already processed this submission (prevent duplicates)
		static $processed_submissions = array();
		$submission_hash = md5( $form_id . serialize( $posted_data ) . time() );
		if ( isset( $processed_submissions[ $submission_hash ] ) ) {
			error_log( 'CF7DBA: Skipping duplicate submission' );
			return;
		}
		$processed_submissions[ $submission_hash ] = true;

		// Filter out Contact Form 7 internal fields
		$form_data = $this->filter_form_data( $posted_data );

		// Debug logging
		// error_log( 'CF7DBA: Posted data: ' . print_r( $posted_data, true ) );
		// error_log( 'CF7DBA: Filtered form data: ' . print_r( $form_data, true ) );

		// Prepare submission data
		$submission_data = array(
			'form_id' => $form_id,
			'form_title' => $form_title,
			'form_data' => $form_data,
		);

		// Save to database
		$submission_id = $this->database->save_submission( $submission_data );

		// Log if save failed
		if ( $submission_id === false ) {
			// error_log( 'CF7DBA: Failed to save submission for form ' . $form_id );
		} else {
			// error_log( 'CF7DBA: Successfully saved submission with ID ' . $submission_id );
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
	 * Get form field types from Contact Form 7 form
	 *
	 * @param string $form_id
	 * @return array
	 */
	public function get_cf7_form_fields( $form_id ) {
		$contact_form = \WPCF7_ContactForm::get_instance( $form_id );
		
		if ( ! $contact_form ) {
			return array();
		}

		$form_content = $contact_form->prop( 'form' );
		$fields = array();

		// Parse form content for field definitions
		preg_match_all( '/\[([^\]]+)\]/', $form_content, $matches );

		foreach ( $matches[1] as $field_definition ) {
			$field_parts = explode( ' ', $field_definition );
			$field_type = $field_parts[0];
			$field_name = '';

			// Extract field name from field definition
			foreach ( $field_parts as $part ) {
				if ( strpos( $part, 'name=' ) === 0 ) {
					$field_name = str_replace( array( 'name=', '"', "'" ), '', $part );
					break;
				}
			}

			if ( ! empty( $field_name ) ) {
				$fields[] = array(
					'field_name' => $field_name,
					'field_type' => $this->map_cf7_field_type( $field_type ),
					'field_label' => ucwords( str_replace( array( '_', '-' ), ' ', $field_name ) ),
					'field_required' => strpos( $field_definition, '*' ) !== false,
				);
			}
		}

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
}
