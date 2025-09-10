<?php
/**
 * CF7 Hooks Component
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA\Components;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CF7_Hooks {

	/**
	 * @var Submission_Manager
	 */
	private $submission_manager;

	/**
	 * Constructor
	 *
	 * @param Submission_Manager $submission_manager
	 */
	public function __construct( Submission_Manager $submission_manager ) {
		$this->submission_manager = $submission_manager;

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
		$this->submission_manager->process_submission( $contact_form );
	}

	/**
	 * Save submission before mail is sent (for multi-step forms)
	 *
	 * @param mixed $contact_form
	 */
	public function save_submission_before_mail( $contact_form ) {
		$submission = \WPCF7_Submission::get_instance();
		if ( $submission ) {
			// Save regardless of mail status for better data capture
			$this->submission_manager->process_submission( $contact_form );
		}
	}

	/**
	 * Save submission on form submit (additional hook)
	 *
	 * @param mixed $contact_form
	 */
	public function save_submission_on_submit( $contact_form ) {
		$submission = \WPCF7_Submission::get_instance();
		if ( $submission && $submission->get_status() !== 'validation_failed' ) {
			$this->submission_manager->process_submission( $contact_form );
		}
	}
}
