<?php
/**
 * Form Manager Component
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA\Components;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Form_Manager {

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
		$forms = $this->database_operations->get_forms_from_submissions();
		
		if ( empty( $forms ) ) {
			return array(
				array(
					'id' => '0',
					'title' => 'No forms available',
				),
			);
		}

		return $forms;
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
		$fields = $this->database_operations->extract_fields_from_submissions( $form_id );
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

		// More comprehensive pattern to match CF7 field syntax
		// Matches: [text your-name], [email* your-email], [textarea your-message], etc.
		preg_match_all( '/\[([a-z*]+)\s+([a-zA-Z_][a-zA-Z0-9_-]*)/', $form_content, $matches );

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
