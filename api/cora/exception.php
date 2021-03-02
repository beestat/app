<?php

namespace cora;

/**
 * Custom exception class. Requires message, code, and replaces $previous with
 * $reportable to indicate if the exception should be reported to a logging
 * service or not.
 *
 * The class name was made lowercase to simplify autoincludes, but the
 * interface was otherwise left alone because I still need to support catching
 * regular exceptions.
 *
 * @author Jon Ziebell
 */
final class exception extends \Exception {
  public function __construct($message, $code, $reportable = true, $extra_info = null, $rollback = true) {
    $this->reportable = $reportable;
    $this->extra_info = $extra_info;
    $this->rollback = $rollback;
    return parent::__construct($message, $code, null);
  }

  public function getReportable() {
    return $this->reportable;
  }

  public function getExtraInfo() {
    return $this->extra_info;
  }

  public function getRollback() {
    return $this->rollback;
  }
}
