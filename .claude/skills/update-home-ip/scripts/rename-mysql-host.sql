-- Rename every MySQL account whose host is the old home IP to the new home IP.
-- Template: Update-HomeIp.ps1 fills in the two IPs below before printing.
-- If no accounts match the old host, PREPARE errors on a NULL statement; that is harmless.
-- Run on the database server as a user with CREATE USER privilege (e.g. root).

SET @old_host = '{{OLD_IP}}';
SET @new_host = '{{NEW_IP}}';

-- Preview what will change
SELECT user, host FROM mysql.user WHERE host = @old_host;

-- Rename every account on the old host in one statement
SELECT GROUP_CONCAT(
  CONCAT(QUOTE(user), '@', QUOTE(host), ' TO ', QUOTE(user), '@', QUOTE(@new_host))
  SEPARATOR ', '
) INTO @pairs
FROM mysql.user
WHERE host = @old_host;

SET @sql = CONCAT('RENAME USER ', @pairs);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify
SELECT user, host FROM mysql.user WHERE host IN (@old_host, @new_host);
