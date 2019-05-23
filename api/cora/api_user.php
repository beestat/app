<?php

namespace cora;

/**
 * Stuff related to API users. For now this is very basic, but this could be
 * extended later on to allow creation and management of these users. At the
 * very least, Cora needs to be able to see if the API user is valid based off
 * of the API key.
 *
 * @author Jon Ziebell
 */
class api_user extends crud {

  public static $converged = [];

  public static $user_locked = false;

}
