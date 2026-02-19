/**
 * Floor plan layers sidebar.
 *
 * @param {number} floor_plan_id
 * @param {object} state Shared floor plan editor state.
 */
beestat.component.floor_plan_layers_sidebar = function(floor_plan_id, state) {
  this.floor_plan_id_ = floor_plan_id;
  beestat.component.apply(this, arguments);
  this.state_ = state;
};
beestat.extend(beestat.component.floor_plan_layers_sidebar, beestat.component);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.floor_plan_layers_sidebar.prototype.decorate_ = function(parent) {
  const self = this;
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const sidebar_state = this.get_sidebar_state_();
  const font_size_small = '12px';
  const font_size_normal = '13px';
  this.layout_metrics_ = {
    'base_left_inset': 6,
    'indent_step': 16,
    'right_inset': 12,
    'action_columns_width': '44px',
    'action_column_gap': '4px',
    'chevron_button_size': '16px'
  };
  parent.style({
    'position': 'relative',
    'height': '100%',
    'overflow': 'visible'
  });

  const container = document.createElement('div');
  Object.assign(container.style, {
    'height': '100%',
    'overflowY': 'auto',
    'padding': '0',
    'borderRadius': beestat.style.size.border_radius + 'px',
    'backgroundColor': 'rgba(47,61,68,0.9)',
    'backdropFilter': 'blur(4px)',
    'border': '1px solid rgba(255,255,255,0.12)',
    'boxShadow': '0 10px 24px rgba(0,0,0,0.4)',
    'boxSizing': 'border-box',
    'fontSize': font_size_small,
    'lineHeight': '1.3',
    'color': beestat.style.color.gray.light,
    'overscrollBehavior': 'contain',
    'WebkitOverflowScrolling': 'touch',
    'touchAction': 'pan-y',
    'scrollbarGutter': 'stable'
  });
  const target_scroll_top = sidebar_state.scroll_top || 0;
  this.restoring_scroll_ = true;
  container.addEventListener('scroll', function() {
    if (self.restoring_scroll_ === true) {
      return;
    }
    sidebar_state.scroll_top = container.scrollTop;
  });
  parent.appendChild(container);
  this.scroll_container_ = container;
  container.scrollTop = target_scroll_top;
  window.requestAnimationFrame(function() {
    container.scrollTop = target_scroll_top;
    window.requestAnimationFrame(function() {
      container.scrollTop = target_scroll_top;
    });
  });
  window.setTimeout(function() {
    container.scrollTop = target_scroll_top;
    self.restoring_scroll_ = false;
    sidebar_state.scroll_top = container.scrollTop;
  }, 40);

  const sorted_groups = Object.values(floor_plan.data.groups)
    .sort(function(a, b) {
      return (b.elevation || 0) - (a.elevation || 0);
    });
  if (sidebar_state.mobile_mode === true) {
    this.decorate_mobile_mode_(container, sorted_groups);
    return;
  }

  const scroll_to = sidebar_state.scroll_to;
  let scroll_to_row;

  if (sidebar_state.initialized_collapsed !== true) {
    sorted_groups.forEach(function(group) {
      sidebar_state.collapsed_groups[group.group_id] = true;
      sidebar_state.collapsed_types[group.group_id + '.trees'] = true;
      sidebar_state.collapsed_types[group.group_id + '.surfaces'] = true;
      sidebar_state.collapsed_types[group.group_id + '.rooms'] = true;
    });
    sidebar_state.initialized_collapsed = true;
  }

  sorted_groups.forEach(function(group) {
    if (sidebar_state.collapsed_groups[group.group_id] === undefined) {
      sidebar_state.collapsed_groups[group.group_id] = true;
    }
    if (sidebar_state.collapsed_types[group.group_id + '.trees'] === undefined) {
      sidebar_state.collapsed_types[group.group_id + '.trees'] = true;
    }
    if (sidebar_state.collapsed_types[group.group_id + '.surfaces'] === undefined) {
      sidebar_state.collapsed_types[group.group_id + '.surfaces'] = true;
    }
    if (sidebar_state.collapsed_types[group.group_id + '.rooms'] === undefined) {
      sidebar_state.collapsed_types[group.group_id + '.rooms'] = true;
    }

    const group_collapsed = sidebar_state.collapsed_groups[group.group_id] === true;
    const is_active_group = (
      self.state_.active_group !== undefined &&
      self.state_.active_group.group_id === group.group_id
    );
    const group_objects = []
      .concat(group.trees || [])
      .concat(group.surfaces || [])
      .concat(group.rooms || []);
    const has_group_objects = group_objects.length > 0;
    const group_all_hidden = has_group_objects === true && group_objects.every(function(object) {
      return object.editor_hidden === true;
    });
    const group_all_locked = has_group_objects === true && group_objects.every(function(object) {
      return object.editor_locked === true;
    });

    const group_panel = document.createElement('div');
    Object.assign(group_panel.style, {
      'marginBottom': '0',
      'borderRadius': '0',
      'border': '1px solid transparent',
      'transition': 'background-color 120ms ease',
      'backgroundColor': 'transparent',
      'paddingLeft': self.layout_metrics_.base_left_inset + 'px',
      'boxShadow': is_active_group
        ? 'inset 3px 0 0 ' + beestat.style.color.lightblue.light
        : 'inset 3px 0 0 transparent'
    });
    container.appendChild(group_panel);

    const group_header = document.createElement('div');
    Object.assign(group_header.style, {
      'display': 'flex',
      'alignItems': 'center',
      'padding': '6px ' + self.layout_metrics_.right_inset + 'px 6px 0',
      'cursor': 'pointer',
      'userSelect': 'none',
      'gap': '6px',
      'borderRadius': '0',
      'border': '1px solid transparent'
    });
    group_panel.appendChild(group_header);

    const group_expand = self.create_icon_button_(
      group_collapsed === true ? 'chevron_right' : 'chevron_down'
    );
    group_expand.setAttribute('type', 'button');
    Object.assign(group_expand.style, {
      'padding': '0',
      'width': self.layout_metrics_.chevron_button_size,
      'height': self.layout_metrics_.chevron_button_size
    });
    group_header.appendChild(group_expand);

    const group_title = document.createElement('div');
    Object.assign(group_title.style, {
      'color': is_active_group ? beestat.style.color.lightblue.light : beestat.style.color.gray.light,
      'fontWeight': is_active_group ? '700' : '600',
      'fontSize': font_size_normal,
      'flex': '1 1 auto'
    });
    group_title.innerText = self.get_display_name_(group.name, 'Unnamed Floor');
    group_header.appendChild(group_title);

    const group_actions = document.createElement('div');
    Object.assign(group_actions.style, {
      'display': 'grid',
      'gridTemplateColumns': '20px 20px',
      'columnGap': self.layout_metrics_.action_column_gap,
      'alignItems': 'center',
      'justifyItems': 'center',
      'flex': '0 0 ' + self.layout_metrics_.action_columns_width
    });
    group_header.appendChild(group_actions);

    const group_visibility = self.create_icon_button_(
      group_all_hidden === true ? 'eye_off' : 'eye',
      group_all_hidden === true ? 'Show floor in editor' : 'Hide floor in editor'
    );
    Object.assign(group_visibility.style, {
      'width': '20px',
      'height': '20px'
    });
    self.apply_icon_state_(group_visibility, group_all_hidden === true);
    group_actions.appendChild(group_visibility);
    group_visibility.addEventListener('click', function(e) {
      e.stopPropagation();
      self.remember_scroll();
      if (self.on_toggle_group_visibility_ !== undefined) {
        self.on_toggle_group_visibility_(group, group_all_hidden === true);
      } else if (self.on_toggle_layer_visibility_ !== undefined) {
        if ((group.trees || []).length > 0) {
          self.on_toggle_layer_visibility_(group, 'trees', group_all_hidden === true);
        }
        if ((group.surfaces || []).length > 0) {
          self.on_toggle_layer_visibility_(group, 'surfaces', group_all_hidden === true);
        }
        if ((group.rooms || []).length > 0) {
          self.on_toggle_layer_visibility_(group, 'rooms', group_all_hidden === true);
        }
      }
    });
    group_visibility.addEventListener('mouseenter', function() {
      group_visibility.style.opacity = '0.9';
    });
    group_visibility.addEventListener('mouseleave', function() {
      self.apply_icon_state_(group_visibility, group_all_hidden === true);
    });

    const group_lock = self.create_icon_button_(
      group_all_locked === true ? 'lock' : 'lock_open',
      group_all_locked === true ? 'Unlock floor' : 'Lock floor'
    );
    Object.assign(group_lock.style, {
      'width': '20px',
      'height': '20px'
    });
    self.apply_icon_state_(group_lock, group_all_locked === true);
    group_actions.appendChild(group_lock);
    group_lock.addEventListener('click', function(e) {
      e.stopPropagation();
      self.remember_scroll();
      if (self.on_toggle_group_lock_ !== undefined) {
        self.on_toggle_group_lock_(group, !group_all_locked);
      } else if (self.on_toggle_layer_lock_ !== undefined) {
        if ((group.trees || []).length > 0) {
          self.on_toggle_layer_lock_(group, 'trees', !group_all_locked);
        }
        if ((group.surfaces || []).length > 0) {
          self.on_toggle_layer_lock_(group, 'surfaces', !group_all_locked);
        }
        if ((group.rooms || []).length > 0) {
          self.on_toggle_layer_lock_(group, 'rooms', !group_all_locked);
        }
      }
    });
    group_lock.addEventListener('mouseenter', function() {
      group_lock.style.opacity = '0.9';
    });
    group_lock.addEventListener('mouseleave', function() {
      self.apply_icon_state_(group_lock, group_all_locked === true);
    });

    group_header.addEventListener('click', function() {
      self.remember_scroll();
      const is_active_group = (
        self.state_.active_group !== undefined &&
        self.state_.active_group.group_id === group.group_id
      );

      if (is_active_group !== true) {
        if (self.on_select_floor_ !== undefined) {
          self.on_select_floor_(group);
        }
        return;
      }

      sidebar_state.collapsed_groups[group.group_id] = !group_collapsed;
      self.rerender();
    });
    group_header.addEventListener('mouseenter', function() {
      group_header.style.backgroundColor = 'rgba(55,71,79,0.7)';
    });
    group_header.addEventListener('mouseleave', function() {
      group_header.style.backgroundColor = 'transparent';
    });

    if (group_collapsed === false) {
      scroll_to_row = self.decorate_group_type_(
        group_panel,
        group,
        'trees',
        'Tree',
        font_size_small,
        scroll_to,
        scroll_to_row
      );
      scroll_to_row = self.decorate_group_type_(
        group_panel,
        group,
        'surfaces',
        'Surface',
        font_size_small,
        scroll_to,
        scroll_to_row
      );
      scroll_to_row = self.decorate_group_type_(
        group_panel,
        group,
        'rooms',
        'Room',
        font_size_small,
        scroll_to,
        scroll_to_row
      );
    }
  });

  this.decorate_expanded_collapse_toggle_(parent);

  if (scroll_to_row !== undefined) {
    window.setTimeout(function() {
      if (scroll_to_row.isConnected === true) {
        const container_rect = container.getBoundingClientRect();
        const row_rect = scroll_to_row.getBoundingClientRect();
        const delta = (
          (row_rect.top - container_rect.top) -
          ((container.clientHeight - row_rect.height) / 2)
        );
        container.scrollTop += delta;
        sidebar_state.scroll_top = container.scrollTop;
      }
      delete sidebar_state.scroll_to;
    }, 60);
  } else if (scroll_to !== undefined) {
    delete sidebar_state.scroll_to;
  }
};

/**
 * Decorate compact mobile-mode floor list.
 *
 * @param {HTMLElement} container
 * @param {object[]} sorted_groups
 */
beestat.component.floor_plan_layers_sidebar.prototype.decorate_mobile_mode_ = function(container, sorted_groups) {
  const self = this;

  Object.assign(container.style, {
    'display': 'flex',
    'flexDirection': 'column',
    'alignItems': 'center',
    'padding': '6px 0',
    'overflowY': 'auto'
  });

  const floors_wrap = document.createElement('div');
  Object.assign(floors_wrap.style, {
    'display': 'flex',
    'flexDirection': 'column',
    'alignItems': 'center',
    'gap': '6px',
    'width': '100%',
    'flex': '1 1 auto',
    'overflowY': 'auto',
    'padding': '2px 0'
  });
  container.appendChild(floors_wrap);

  const icon_map = {};
  let icon_number = 1;
  sorted_groups.slice().sort(function(a, b) {
    return (a.elevation || 0) - (b.elevation || 0);
  }).forEach(function(group) {
    if (typeof group.icon === 'string' && group.icon !== '') {
      icon_map[group.group_id] = group.icon;
    } else if ((group.elevation || 0) < 0) {
      icon_map[group.group_id] = 'alpha_b';
    } else {
      icon_map[group.group_id] = 'numeric_' + icon_number++;
    }
  });

  sorted_groups.forEach(function(group) {
    let icon_name = icon_map[group.group_id] || 'layers';

    const is_active_group = (
      self.state_.active_group !== undefined &&
      self.state_.active_group.group_id === group.group_id
    );
    if (is_active_group === true) {
      icon_name += '_box';
    }

    const floor_button = self.create_icon_button_(
      icon_name,
      self.get_display_name_(group.name, 'Unnamed Floor')
    );
    Object.assign(floor_button.style, {
      'width': '36px',
      'height': '36px',
      'minWidth': '36px',
      'maxWidth': '36px',
      'flex': '0 0 36px',
      'opacity': is_active_group === true ? '1' : '0.8',
      'transition': 'opacity 120ms ease, color 120ms ease'
    });
    const floor_icon = floor_button.querySelector('.icon');
    if (floor_icon !== null) {
      floor_icon.className = 'icon ' + icon_name + ' f24';
      floor_icon.style.width = '24px';
      floor_icon.style.height = '24px';
      floor_icon.style.lineHeight = '24px';
    }
    if (is_active_group === true) {
      floor_button.style.color = beestat.style.color.lightblue.light;
    } else {
      floor_button.style.color = beestat.style.color.gray.light;
    }
    floor_button.addEventListener('mouseenter', function() {
      floor_button.style.opacity = '1';
      floor_button.style.color = beestat.style.color.lightblue.light;
    });
    floor_button.addEventListener('mouseleave', function() {
      floor_button.style.opacity = is_active_group === true ? '1' : '0.8';
      floor_button.style.color = is_active_group === true
        ? beestat.style.color.lightblue.light
        : beestat.style.color.gray.light;
    });
    floor_button.addEventListener('click', function(e) {
      e.stopPropagation();
      if (is_active_group !== true && self.on_select_floor_ !== undefined) {
        self.on_select_floor_(group);
      }
    });
    floors_wrap.appendChild(floor_button);
  });

  const expand_wrap = document.createElement('div');
  Object.assign(expand_wrap.style, {
    'width': '100%',
    'display': 'flex',
    'justifyContent': 'center',
    'padding': '6px 0 4px 0'
  });
  container.appendChild(expand_wrap);

  const expand_button = this.create_icon_button_('chevron_down', 'Expand');
  Object.assign(expand_button.style, {
    'width': '32px',
    'height': '32px',
    'minWidth': '32px',
    'maxWidth': '32px',
    'flex': '0 0 32px',
    'opacity': '0.85'
  });
  const expand_icon = expand_button.querySelector('.icon');
  if (expand_icon !== null) {
    expand_icon.className = 'icon chevron_down f24';
    expand_icon.style.transform = 'rotate(90deg)';
    expand_icon.style.display = 'inline-block';
    expand_icon.style.width = '24px';
    expand_icon.style.height = '24px';
    expand_icon.style.lineHeight = '24px';
    expand_icon.style.textAlign = 'center';
  }
  expand_button.addEventListener('click', function(e) {
    e.stopPropagation();
    self.set_mobile_mode_(false);
  });
  expand_wrap.appendChild(expand_button);
};

/**
 * Decorate collapse toggle for expanded mode.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.floor_plan_layers_sidebar.prototype.decorate_expanded_collapse_toggle_ = function(parent) {
  const self = this;
  const collapse_button = this.create_icon_button_('chevron_right', 'Collapse');
  Object.assign(collapse_button.style, {
    'position': 'absolute',
    'left': '-14px',
    'bottom': '10px',
    'width': '28px',
    'height': '28px',
    'minWidth': '28px',
    'maxWidth': '28px',
    'backgroundColor': beestat.style.color.bluegray.base,
    'border': '1px solid rgba(255,255,255,0.18)',
    'borderRadius': beestat.style.size.border_radius + 'px',
    'zIndex': '6',
    'opacity': '0.95',
    'padding': '0',
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center'
  });
  const collapse_icon = collapse_button.querySelector('.icon');
  if (collapse_icon !== null) {
    collapse_icon.className = 'icon chevron_right f24';
    collapse_icon.style.width = '24px';
    collapse_icon.style.height = '24px';
    collapse_icon.style.lineHeight = '24px';
    collapse_icon.style.display = 'inline-block';
    collapse_icon.style.textAlign = 'center';
  }
  collapse_button.addEventListener('click', function(e) {
    e.stopPropagation();
    self.set_mobile_mode_(true);
  });
  parent.appendChild(collapse_button);
};

/**
 * Decorate one fixed type section in a group.
 *
 * @param {HTMLElement} parent
 * @param {object} group
 * @param {string} type trees|surfaces|rooms
 * @param {string} singular
 * @param {string} font_size_small
 * @param {object|undefined} scroll_to
 * @param {HTMLElement|undefined} scroll_to_row
 *
 * @return {HTMLElement|undefined}
 */
beestat.component.floor_plan_layers_sidebar.prototype.decorate_group_type_ = function(parent, group, type, singular, font_size_small, scroll_to, scroll_to_row) {
  const self = this;
  const sidebar_state = this.get_sidebar_state_();
  const layout_metrics = this.layout_metrics_ || {
    'base_left_inset': 6,
    'indent_step': 16,
    'right_inset': 12,
    'action_columns_width': '44px',
    'action_column_gap': '4px',
    'chevron_button_size': '16px'
  };
  const indent_step = Number.parseInt(layout_metrics.indent_step, 10) || 16;
  const collapse_key = group.group_id + '.' + type;
  const type_collapsed = sidebar_state.collapsed_types[collapse_key] === true;
  const objects = group[type] || [];
  if (objects.length === 0) {
    return scroll_to_row;
  }
  const all_hidden = objects.every(function(object) {
    return object.editor_hidden === true;
  });
  const all_locked = objects.every(function(object) {
    return object.editor_locked === true;
  });

  const section = document.createElement('div');
  Object.assign(section.style, {
    'marginLeft': '0',
    'marginBottom': '0'
  });
  parent.appendChild(section);

  const header = document.createElement('div');
  Object.assign(header.style, {
    'display': 'flex',
    'alignItems': 'center',
    'padding': '4px ' + layout_metrics.right_inset + 'px 4px ' + indent_step + 'px',
    'color': beestat.style.color.gray.base,
    'fontSize': font_size_small,
    'userSelect': 'none',
    'cursor': 'pointer',
    'gap': '6px',
    'borderRadius': '0',
    'border': '1px solid transparent',
    'transition': 'background-color 120ms ease'
  });
  section.appendChild(header);

  const expand = this.create_icon_button_(
    type_collapsed === true ? 'chevron_right' : 'chevron_down'
  );
  expand.setAttribute('type', 'button');
  Object.assign(expand.style, {
    'padding': '0',
    'width': layout_metrics.chevron_button_size,
    'height': layout_metrics.chevron_button_size
  });
  header.appendChild(expand);
  const text = document.createElement('div');
  text.innerText = singular + 's (' + objects.length + ')';
  text.style.flex = '1 1 auto';
  header.appendChild(text);

  const header_actions = document.createElement('div');
  Object.assign(header_actions.style, {
    'display': 'grid',
    'gridTemplateColumns': '20px 20px',
    'columnGap': layout_metrics.action_column_gap,
    'alignItems': 'center',
    'justifyItems': 'center',
    'flex': '0 0 ' + layout_metrics.action_columns_width
  });
  header.appendChild(header_actions);

  const layer_visibility = this.create_icon_button_(
    all_hidden === true ? 'eye_off' : 'eye',
    all_hidden === true ? 'Show layer in editor' : 'Hide layer in editor'
  );
  Object.assign(layer_visibility.style, {
    'width': '20px',
    'height': '20px'
  });
  this.apply_icon_state_(layer_visibility, all_hidden === true);
  header_actions.appendChild(layer_visibility);
  layer_visibility.addEventListener('click', function(e) {
    e.stopPropagation();
    self.remember_scroll();
    if (self.on_toggle_layer_visibility_ !== undefined) {
      self.on_toggle_layer_visibility_(group, type, all_hidden === true);
    }
  });
  layer_visibility.addEventListener('mouseenter', function() {
    layer_visibility.style.opacity = '0.9';
  });
  layer_visibility.addEventListener('mouseleave', function() {
    self.apply_icon_state_(layer_visibility, all_hidden === true);
  });

  const layer_lock = this.create_icon_button_(
    all_locked === true ? 'lock' : 'lock_open',
    all_locked === true ? 'Unlock layer' : 'Lock layer'
  );
  Object.assign(layer_lock.style, {
    'width': '20px',
    'height': '20px'
  });
  this.apply_icon_state_(layer_lock, all_locked === true);
  header_actions.appendChild(layer_lock);
  layer_lock.addEventListener('click', function(e) {
    e.stopPropagation();
    self.remember_scroll();
    if (self.on_toggle_layer_lock_ !== undefined) {
      self.on_toggle_layer_lock_(group, type, !all_locked);
    }
  });
  layer_lock.addEventListener('mouseenter', function() {
    layer_lock.style.opacity = '0.9';
  });
  layer_lock.addEventListener('mouseleave', function() {
    self.apply_icon_state_(layer_lock, all_locked === true);
  });

  header.addEventListener('click', function() {
    self.remember_scroll();
    sidebar_state.collapsed_types[collapse_key] = !type_collapsed;
    self.rerender();
  });
  header.addEventListener('mouseenter', function() {
    header.style.backgroundColor = 'rgba(55,71,79,0.55)';
  });
  header.addEventListener('mouseleave', function() {
    header.style.backgroundColor = 'transparent';
  });

  if (type_collapsed === true) {
    return scroll_to_row;
  }

  objects.forEach(function(object, index) {
    const object_id = self.get_object_id_(type, object);
    const is_visible = object.editor_hidden !== true;

  const row = document.createElement('div');
    Object.assign(row.style, {
      'display': 'flex',
      'alignItems': 'center',
      'gap': '6px',
      'padding': '4px ' + layout_metrics.right_inset + 'px 4px ' + (indent_step * 2) + 'px',
      'cursor': 'pointer',
      'opacity': is_visible ? '1' : '0.55',
      'borderRadius': '0',
      'borderLeft': '1px solid transparent',
      'borderRight': '1px solid transparent',
      'borderTop': '2px solid transparent',
      'borderBottom': '2px solid transparent',
      'transition': 'background-color 120ms ease',
      'backgroundColor': self.is_active_row_(type, object_id)
        ? 'rgba(69,170,242,0.2)'
        : 'transparent'
    });
    section.appendChild(row);
    row.setAttribute('draggable', 'true');

    if (
      scroll_to !== undefined &&
      scroll_to_row === undefined &&
      scroll_to.group_id === group.group_id &&
      scroll_to.type === type &&
      scroll_to.object_id === object_id
    ) {
      scroll_to_row = row;
    }

    row.addEventListener('dragstart', function(e) {
      if (object.editor_locked === true) {
        e.preventDefault();
        return;
      }
      self.drag_data_ = {
        'group_id': group.group_id,
        'type': type,
        'index': index
      };
      e.dataTransfer.effectAllowed = 'move';
      row.style.opacity = '0.35';
      row.style.backgroundColor = 'rgba(69,170,242,0.35)';
    });

    row.addEventListener('dragover', function(e) {
      if (
        self.drag_data_ !== undefined &&
        self.drag_data_.group_id === group.group_id &&
        self.drag_data_.type === type
      ) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = row.getBoundingClientRect();
        const drop_after = e.clientY > rect.top + (rect.height / 2);
        row.dataset.dropPos = drop_after ? 'after' : 'before';
        row.style.borderTop = drop_after ? '2px solid transparent' : '2px solid ' + beestat.style.color.lightblue.light;
        row.style.borderBottom = drop_after ? '2px solid ' + beestat.style.color.lightblue.light : '2px solid transparent';
      }
    });

    row.addEventListener('drop', function(e) {
      if (
        self.drag_data_ !== undefined &&
        self.drag_data_.group_id === group.group_id &&
        self.drag_data_.type === type &&
        self.drag_data_.index !== index &&
        self.on_reorder_ !== undefined
      ) {
        e.preventDefault();
        const drop_after = row.dataset.dropPos === 'after';
        self.remember_scroll();
        self.on_reorder_(group, type, self.drag_data_.index, index, drop_after);
      }
      row.style.borderTop = '2px solid transparent';
      row.style.borderBottom = '2px solid transparent';
      delete row.dataset.dropPos;
      self.drag_data_ = undefined;
    });
    row.addEventListener('dragleave', function() {
      row.style.borderTop = '2px solid transparent';
      row.style.borderBottom = '2px solid transparent';
      delete row.dataset.dropPos;
    });

    row.addEventListener('dragend', function() {
      self.drag_data_ = undefined;
      row.style.opacity = is_visible ? '1' : '0.55';
      row.style.borderTop = '2px solid transparent';
      row.style.borderBottom = '2px solid transparent';
      delete row.dataset.dropPos;
      if (self.is_active_row_(type, object_id) !== true) {
        row.style.backgroundColor = 'transparent';
      }
    });

    row.addEventListener('click', function() {
      self.remember_scroll();
      if (self.on_select_object_ !== undefined) {
        self.on_select_object_(group, type, object_id);
      }
    });
    row.addEventListener('mouseenter', function() {
      if (self.is_active_row_(type, object_id) !== true) {
        row.style.backgroundColor = 'rgba(55,71,79,0.55)';
      }
    });
    row.addEventListener('mouseleave', function() {
      if (self.is_active_row_(type, object_id) !== true) {
        row.style.backgroundColor = 'transparent';
      }
    });

    const object_icon = document.createElement('span');
    object_icon.className = 'icon ' + self.get_type_icon_(type) + ' f16';
    object_icon.style.color = beestat.style.color.gray.base;
    object_icon.style.width = '16px';
    object_icon.style.flex = '0 0 16px';
    object_icon.style.textAlign = 'center';
    row.appendChild(object_icon);

    const label = document.createElement('div');
    Object.assign(label.style, {
      'flex': '1 1 auto',
      'minWidth': '0',
      'color': beestat.style.color.gray.light,
      'fontSize': font_size_small,
      'whiteSpace': 'nowrap',
      'overflow': 'hidden',
      'textOverflow': 'ellipsis'
    });
    label.innerText = self.get_object_label_(singular, object, index);
    row.appendChild(label);

    const row_actions = document.createElement('div');
    Object.assign(row_actions.style, {
      'display': 'grid',
      'gridTemplateColumns': '20px 20px',
      'columnGap': layout_metrics.action_column_gap,
      'alignItems': 'center',
      'justifyItems': 'center',
      'flex': '0 0 ' + layout_metrics.action_columns_width
    });
    row.appendChild(row_actions);

    const visibility_icon = is_visible ? 'eye' : 'eye_off';
    const visibility_title = is_visible ? 'Hide in editor' : 'Show in editor';
    const visibility_button = self.create_icon_button_(visibility_icon, visibility_title);
    Object.assign(visibility_button.style, {
      'width': '20px',
      'height': '20px',
      'flex': '0 0 20px'
    });
    self.apply_icon_state_(visibility_button, is_visible === false);
    row_actions.appendChild(visibility_button);
    visibility_button.addEventListener('click', function(e) {
      e.stopPropagation();
      self.remember_scroll();
      if (self.on_toggle_visibility_ !== undefined) {
        self.on_toggle_visibility_(group, type, object_id, !is_visible);
      }
    });
    visibility_button.addEventListener('mouseenter', function() {
      visibility_button.style.opacity = '0.9';
    });
    visibility_button.addEventListener('mouseleave', function() {
      self.apply_icon_state_(visibility_button, is_visible === false);
    });

    const lock_icon = object.editor_locked === true ? 'lock' : 'lock_open';
    const lock_title = object.editor_locked === true ? 'Unlock object' : 'Lock object';
    const lock = self.create_icon_button_(lock_icon, lock_title);
    Object.assign(lock.style, {
      'width': '20px',
      'height': '20px',
      'flex': '0 0 20px'
    });
    self.apply_icon_state_(lock, object.editor_locked === true);
    row_actions.appendChild(lock);

    lock.addEventListener('click', function(e) {
      e.stopPropagation();
      self.remember_scroll();
      if (self.on_toggle_lock_ !== undefined) {
        self.on_toggle_lock_(group, type, object_id, !(object.editor_locked === true));
      }
    });
    lock.addEventListener('mouseenter', function() {
      lock.style.opacity = '0.9';
    });
    lock.addEventListener('mouseleave', function() {
      self.apply_icon_state_(lock, object.editor_locked === true);
    });
  });

  return scroll_to_row;
};

/**
 * Create an icon-font button.
 *
 * @param {string} icon_name
 * @param {string} title
 *
 * @return {HTMLButtonElement}
 */
beestat.component.floor_plan_layers_sidebar.prototype.create_icon_button_ = function(icon_name, title) {
  const button = document.createElement('button');
  button.setAttribute('type', 'button');
  Object.assign(button.style, {
    'border': 'none',
    'background': 'transparent',
    'color': beestat.style.color.gray.light,
    'cursor': 'pointer',
    'padding': '0',
    'display': 'inline-flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'width': '20px',
    'height': '20px',
    'minWidth': '20px',
    'maxWidth': '20px',
    'flex': '0 0 20px'
  });
  if (title !== undefined) {
    button.setAttribute('title', title);
  }

  const icon = document.createElement('span');
  icon.className = 'icon ' + icon_name + ' f16';
  Object.assign(icon.style, {
    'width': '16px',
    'height': '16px',
    'lineHeight': '16px',
    'textAlign': 'center',
    'display': 'inline-block'
  });
  button.appendChild(icon);

  return button;
};

/**
 * Persist current scroll position to shared sidebar state.
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.remember_scroll = function() {
  const sidebar_state = this.get_sidebar_state_();
  if (this.restoring_scroll_ === true) {
    return this;
  }
  if (this.scroll_container_ !== undefined) {
    sidebar_state.scroll_top = this.scroll_container_.scrollTop;
  }
  return this;
};

/**
 * Apply icon brightness state.
 *
 * @param {HTMLButtonElement} button
 * @param {boolean} edge_state
 */
beestat.component.floor_plan_layers_sidebar.prototype.apply_icon_state_ = function(button, edge_state) {
  button.style.opacity = edge_state === true ? '0.85' : '0.22';
};

/**
 * Set sidebar mode and notify parent.
 *
 * @param {boolean} mobile_mode
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_mobile_mode_ = function(mobile_mode) {
  const sidebar_state = this.get_sidebar_state_();
  const next_mobile_mode = mobile_mode === true;
  if (sidebar_state.mobile_mode === next_mobile_mode) {
    return;
  }

  sidebar_state.mobile_mode = next_mobile_mode;
  if (this.on_toggle_mobile_mode_ !== undefined) {
    this.on_toggle_mobile_mode_(next_mobile_mode);
  } else {
    this.rerender();
  }
};

/**
 * Get icon name for type.
 *
 * @param {string} type
 *
 * @return {string}
 */
beestat.component.floor_plan_layers_sidebar.prototype.get_type_icon_ = function(type) {
  if (type === 'trees') {
    return 'tree';
  }
  if (type === 'surfaces') {
    return 'texture_box';
  }
  return 'view_quilt';
};

/**
 * Get state bucket.
 *
 * @return {object}
 */
beestat.component.floor_plan_layers_sidebar.prototype.get_sidebar_state_ = function() {
  if (this.state_.layers_sidebar === undefined) {
    this.state_.layers_sidebar = {
      'collapsed_groups': {},
      'collapsed_types': {}
    };
  }
  if (this.state_.layers_sidebar.collapsed_groups === undefined) {
    this.state_.layers_sidebar.collapsed_groups = {};
  }
  if (this.state_.layers_sidebar.collapsed_types === undefined) {
    this.state_.layers_sidebar.collapsed_types = {};
  }
  if (this.state_.layers_sidebar.mobile_mode === undefined) {
    this.state_.layers_sidebar.mobile_mode = (
      beestat.platform() === 'ios' ||
      beestat.platform() === 'android'
    );
  }
  return this.state_.layers_sidebar;
};

/**
 * Get object id by type.
 *
 * @param {string} type
 * @param {object} object
 *
 * @return {string|undefined}
 */
beestat.component.floor_plan_layers_sidebar.prototype.get_object_id_ = function(type, object) {
  if (type === 'rooms') {
    return object.room_id;
  }
  if (type === 'surfaces') {
    return object.surface_id;
  }
  return object.tree_id;
};

/**
 * Get display label for an object.
 *
 * @param {string} singular
 * @param {object} object
 * @param {number} index
 *
 * @return {string}
 */
beestat.component.floor_plan_layers_sidebar.prototype.get_object_label_ = function(singular, object, index) {
  return this.get_display_name_(object.name, singular + ' ' + (index + 1));
};

/**
 * Get a displayable name with fallback.
 *
 * @param {*} value
 * @param {string} fallback
 *
 * @return {string}
 */
beestat.component.floor_plan_layers_sidebar.prototype.get_display_name_ = function(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return fallback;
  }

  return trimmed;
};

/**
 * Whether the row is active.
 *
 * @param {string} type
 * @param {string} object_id
 *
 * @return {boolean}
 */
beestat.component.floor_plan_layers_sidebar.prototype.is_active_row_ = function(type, object_id) {
  if (
    type === 'rooms' &&
    this.state_.active_room_entity !== undefined &&
    this.state_.active_room_entity.get_room().room_id === object_id
  ) {
    return true;
  }
  if (
    type === 'surfaces' &&
    this.state_.active_surface_entity !== undefined &&
    this.state_.active_surface_entity.get_surface().surface_id === object_id
  ) {
    return true;
  }
  if (
    type === 'trees' &&
    this.state_.active_tree_entity !== undefined &&
    this.state_.active_tree_entity.get_tree().tree_id === object_id
  ) {
    return true;
  }
  return false;
};

/**
 * Set floor selection callback.
 *
 * @param {function(object)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_select_floor = function(callback) {
  this.on_select_floor_ = callback;
  return this;
};

/**
 * Set object selection callback.
 *
 * @param {function(object, string, string)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_select_object = function(callback) {
  this.on_select_object_ = callback;
  return this;
};

/**
 * Set visibility callback.
 *
 * @param {function(object, string, string, boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_visibility = function(callback) {
  this.on_toggle_visibility_ = callback;
  return this;
};

/**
 * Set lock callback.
 *
 * @param {function(object, string, string, boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_lock = function(callback) {
  this.on_toggle_lock_ = callback;
  return this;
};

/**
 * Set layer visibility callback.
 *
 * @param {function(object, string, boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_layer_visibility = function(callback) {
  this.on_toggle_layer_visibility_ = callback;
  return this;
};

/**
 * Set layer lock callback.
 *
 * @param {function(object, string, boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_layer_lock = function(callback) {
  this.on_toggle_layer_lock_ = callback;
  return this;
};

/**
 * Set group visibility callback.
 *
 * @param {function(object, boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_group_visibility = function(callback) {
  this.on_toggle_group_visibility_ = callback;
  return this;
};

/**
 * Set group lock callback.
 *
 * @param {function(object, boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_group_lock = function(callback) {
  this.on_toggle_group_lock_ = callback;
  return this;
};

/**
 * Set mobile-mode toggle callback.
 *
 * @param {function(boolean)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_toggle_mobile_mode = function(callback) {
  this.on_toggle_mobile_mode_ = callback;
  return this;
};

/**
 * Set reorder callback.
 *
 * @param {function(object, string, number, number)} callback
 *
 * @return {beestat.component.floor_plan_layers_sidebar} This.
 */
beestat.component.floor_plan_layers_sidebar.prototype.set_on_reorder = function(callback) {
  this.on_reorder_ = callback;
  return this;
};
