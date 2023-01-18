<?php

namespace cora;

/**
 * All of the settings used in Cora. This file should never be committed to
 * source control and should contain all of the configuration, API keys, etc.
 *
 * @author Jon Ziebell
 */
final class setting {

  /**
   * The singleton.
   */
  private static $instance;

  /**
   * Constructor.
   */
  private function __construct() {}

  /**
   * Use this function to instantiate this class instead of calling new
   * setting() (which isn't allowed anyways). This is necessary so that the
   * API class can have access to Setting.
   *
   * @return setting A new setting object or the already created one.
   */
  public static function get_instance() {
    if(isset(self::$instance) === false) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  private $settings = [
    /**
     * Which environment context the code is running in. Every setting can
     * either be a single value or an array of values, where the key is the
     * environment. Allows you to use a single configuration file for
     * dev/stage/live.
     *
     * Setting this to dev will make it easier to debug issues as many error
     * details are hidden in live mode.
     *
     * Valid values are:
     *   dev: Development environment, points to all development resources.
     *   stage: Staging environment, typically points to all live resources.
     *   live: Live environment, points to all live resources.
     */
    'environment' => 'dev',

    /**
     * Used to uniquely identify this particular commit.
     */
    'commit' => null,

    /**
     * The beestat API key for the main beestat API user.
     *
     * Example: ert90ujrt5yifhkfgml4ert90ujrt5yifhkf9g6a
     */
    'beestat_api_key_local' => '',

    /**
     * The beestat API key for when ecobee makes an API call to beestat.
     *
     * Example: 2hFpGKrsS586hHaU9g6vZZdQS586hHaUwY9kdctx
     */
    'ecobee_api_key_local' => '',

    /**
     * Your ecobee Client ID; provided to you when you create an app as an
     * ecobee developer.
     *
     * Example: 5tEd6Fdhw8HebcS7pD8gKtgMvuczqp88
     */
    'ecobee_client_id' => '',

    /**
     * URI to redirect to after you authorize your app to access your ecobee
     * account. Set this here and when creating your ecobee app.
     *
     * Example: https://beestat.io/api/ecobee_initialize.php
     */
    'ecobee_redirect_uri' => '',

    /**
     * The Patreon API key for when Patreon makes an API call to beestat.
     *
     * Example: 2hFpGKrsS586hHaA9g6vZZdQS586hHaUwY9kdctx
     */
    'patreon_api_key_local' => '',

    /**
     * Your Patreon Client ID; provided to you when you create an app as a
     * Patreon developer.
     *
     * Example: 8HebcS7pD8_d6Fdhw8Heb-ebcS7pD8gKtgMvuczq-tEd6Fdhw8Heb_S7pD8gKtgMv
     */
    'patreon_client_id' => '',

    /**
     * URI to redirect to after you authorize your app to access your ecobee
     * account. Set this here and when creating your ecobee app.
     *
     * Example: https://beestat.io/api/patreon_initialize.php
     */
    'patreon_redirect_uri' => '',

    /**
     * Used anytime the API needs to know where the site is at. Don't forget
     * the trailing slash.
     *
     * Example: https://app.beestat.io/
     */
    'beestat_root_uri' => '',

    /**
     * Your Mailgun API Key.
     *
     * Example: 4b34e48e768fa45c4a6ac65dd4cf1da9-7e28d3c3-61713777
     */
    'mailgun_api_key' => '',

    /**
     * API base URL including the sending domain. Make sure to include the
     * trailing slash.
     *
     * Example: https://api.mailgun.net/v3/
     */
    'mailgun_base_url' => '',

    /**
     * The specific newsletter to subscribe users to.
     *
     * Example: newsletter@app.beestat.io
     */
    'mailgun_newsletter' => '',

    /**
     * Auth ID for Smarty Streets address verification.
     *
     * Example: 7vuw3NSz-TJgG-v8Af-7vuw-4TJgGS5k7vuw
     */
    'smarty_streets_auth_id' => '',

    /**
     * Auth Token for Smarty Streets address verification.
     *
     * Example: gGS5k7vuw3NSzkRMSWNP
     */
    'smarty_streets_auth_token' => '',

    /**
     * Secret key for Stripe
     *
     * Example: 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
     */
    'stripe_secret_key' => '',

    /**
     * Stripe base URL.
     *
     * Example: https://api.stripe.com/v1/
     */
    'stripe_base_url' => '',

    /**
     * Stripe Product ID.
     *
     * Example: prod_0NXlpZmhrZmdtb
     */
    'stripe_product_id' => '',

    /**
     * Whether or not debugging is enabled. Debugging will produce additional
     * output in the API response.
     */
    'debug' => true,

    /**
     * Primary database connection information. Must be a MySQL database.
     */
    'database_host' => '',
    'database_username' => '',
    'database_password' => '',
    'database_name' => '',

    /**
     * Key and project id obtained from the Sentry DSN. See sentry.io.
     */
    'sentry_key' => '',
    'sentry_project_id' => '',

    /**
     * Whether or not SSL is required.
     */
    'force_ssl' => true,

    /**
     * The number of requests allowed from a given IP address per minute. Set
     * to null to disable.
     */
    'requests_per_minute' => null,

    /**
     * The number of requests allowed in a single batch API call. Set to null
     * to disable.
     */
    'batch_limit' => null
  ];

  /**
   * Get a setting. Will return the setting for the current environment if it
   * exists.
   *
   * @param string $setting The setting name.
   *
   * @throws \Exception If the setting does not exist.
   *
   * @return mixed The setting
   */
  public function get($setting) {
    if(array_key_exists($setting, $this->settings) === true) {
      if(is_array($this->settings[$setting]) === true) {
        if(array_key_exists($this->settings['environment'], $this->settings[$setting]) === true) {
          return $this->settings[$setting][$this->settings['environment']];
        } else {
          throw new \Exception('Setting does not exist for environment.');
        }
      } else {
        return $this->settings[$setting];
      }
    } else {
      throw new \Exception('Setting does not exist.', 1300);
    }
  }
  }

  /**
   * Whether or not the current configuration is running the demo.
   *
   * @return boolean
   */
  public function is_demo() {
    return false;
  }

}
