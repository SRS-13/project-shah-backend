export enum ProjectPermission {
  VIEW_PROJECT = 'project:view',
  UPDATE_PROJECT = 'project:update',
  DELETE_PROJECT = 'project:delete',

  VIEW_MEMBERS = 'project:members:view',
  MANAGE_MEMBERS = 'project:members:manage',
  MANAGE_MANAGERS = 'project:managers:manage',

  VIEW_TASKS = 'task:view',
  CREATE_TASK = 'task:create',
  UPDATE_TASK = 'task:update',
  DELETE_TASK = 'task:delete',
  ASSIGN_TASK = 'task:assign',

  VIEW_COMMENTS = 'comment:view',
  CREATE_COMMENT = 'comment:create',

  VIEW_ACTIVITY = 'activity:view',

  MANAGE_SETTINGS = 'project:settings:manage',
}