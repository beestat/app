<?php

namespace cora;

/**
 * CRUD base class for most resources. Provides the ability to create
 * (insert), read (select), update (update), and delete (update set
 * deleted=1). There are also a few extra methods: read_id, get, and undelete.
 *
 * These methods can (and should) be overridden by child classes. The most
 * basic override would simply call the parent function. More advanced
 * overrides might set a value like created_by before creating.
 *
 * Child classes can, at any time, call the parent methods directly from any
 * of their methods.
 *
 * @author Jon Ziebell
 */
abstract class crud extends api {

  public static $converged = [];

  public static $user_locked = true;

  /**
   * Insert an item into the current resource with the provided attributes.
   * Setting of the primary key column is not allowed and will be overwritten
   * if you try.
   *
   * @param array $attributes An array of attributes to set for this item
   *
   * @return mixed The id of the inserted row.
   */
  public function create($attributes) {
    unset($attributes[$this->table . '_id']);

    if($this::$user_locked === true) {
      $attributes['user_id'] = $this->session->get_user_id();
    }

    return $this->database->create($this->resource, $attributes);
  }

  /**
   * Read items from the current resource according to the specified
   * $attributes. Only undeleted items are selected by default. This can be
   * altered by manually specifying deleted=1 or deleted=[0, 1] in
   * $attributes.
   *
   * @param array $attributes An array of key value pairs to search by and can
   * include arrays if you want to search in() something.
   * @param array $columns The columns from the resource to return. If not
   * specified, all columns are returned.
   *
   * @return array The requested items with the requested columns in a
   * 0-indexed array.
   */
  public function read($attributes = [], $columns = []) {
    if($attributes === null) {
      $attributes = [];
    }
    if($columns === null) {
      $columns = [];
    }

    $attributes = $attributes + ['deleted' => 0];

    if($this::$user_locked === true) {
      $attributes['user_id'] = $this->session->get_user_id();
    }

    return $this->database->read($this->resource, $attributes, $columns);
  }

  /**
   * See comment on crud->read() for more detail. The return array is
   * indexed by the primary key of the resource items.
   *
   * @param array $attributes An array of key value pairs to search by and
   * can include arrays if you want to search in() something.
   * @param array $columns The columns from the resource to return. If not
   * specified, all columns are returned.
   *
   * @return array The requested items with the requested colums in a primary-
   * key-indexed array.
   */
  public function read_id($attributes = [], $columns = []) {
    if($attributes === null) {
      $attributes = [];
    }
    if($columns === null) {
      $columns = [];
    }

    // If no columns are specified to read, force the primary key column to be
    // included. This will ensure that no error is thrown when the result of the
    // query is converted into the ID array.
    if(count($columns) > 0) {
      $columns[] = $this->table . '_id';
    }

    $rows = $this->read($attributes, $columns);
    $rows_id = [];
    foreach($rows as $row) {
      // Remove the *_id column and add in the row.
      $rows_id[$row[$this->table . '_id']] = $row;
    }
    return $rows_id;
  }

  /**
   * Get a single item, searching using whatever attributes you specify.
   *
   * @param array|int $attributes Search attributes or the ID of the row you
   * want.
   *
   * @return array The found item.
   *
   * @throws \Exception If more than one item was found.
   */
  public function get($attributes) {
    // Doing this so I can call $this->get(#) which is pretty common.
    if(is_array($attributes) === false) {
      $id = $attributes;
      $attributes = [];
      $attributes[$this->table . '_id'] = $id;
    }

    $items = $this->read($attributes);
    if(count($items) > 1) {
      throw new \Exception('Tried to get but more than one item was returned.', 1100);
    }
    else if(count($items) === 0) {
      return null;
    }
    else {
      return $items[0];
    }
  }

  /**
   * Updates the current resource item with the provided id and sets the
   * provided attributes.
   *
   * @param int $id The id of the item to update.
   * @param array $attributes An array of attributes to set for this item.
   *
   * @return int The updated row.
   */
  public function update($attributes) {
    // Get the item first to see if it exists. The get call will throw an
    // exception if the ID you sent does not exist or cannot be read due to the
    // user_locked setting.
    $this->get($attributes[$this->table . '_id']);

    return $this->database->update($this->resource, $attributes);
  }

  /**
   * Deletes an item with the provided id from the current resource. Deletes
   * always update the row to set deleted=1 instead of removing it from the
   * database.
   *
   * @param int $id The id of the item to delete.
   *
   * @return array The deleted row.
   */
  public function delete($id) {
    $attributes = [];
    $attributes[$this->table . '_id'] = $id;
    $attributes['deleted'] = 1;

    return $this->update($attributes);
  }

  /**
   * Undeletes an item with the provided id from the current resource. This
   * will update the row and set deleted = 0.
   *
   * @param int $id The id of the item to delete.
   *
   * @return array The undeleted row.
   */
  public function undelete($id) {
    $attributes = [];
    $attributes[$this->table . '_id'] = $id;
    $attributes['deleted'] = 0;

    return $this->update($attributes);
  }
}
