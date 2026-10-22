import Project from './project.js';

const DEFAULT_PROJECT_NAME = 'Inbox';

class ProjectList {
  constructor() {
    this.projects = [];
    this.defaultProjectId = null;
    this.ensureDefaultProject();
  }

  ensureDefaultProject() {
    if (this.projects.length === 0) {
      const project = new Project(DEFAULT_PROJECT_NAME);
      this.projects.push(project);
      this.defaultProjectId = project.id;
    } else if (!this.getProject(this.defaultProjectId)) {
      this.defaultProjectId = this.projects[0].id;
    }
    return this.getProject(this.defaultProjectId);
  }

  get defaultProject() {
    return this.getProject(this.defaultProjectId);
  }

  addProject(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = this.projects.find(
      (project) => project.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const project = new Project(trimmed);
    this.projects.push(project);
    return project;
  }

  removeProject(projectId) {
    if (projectId === this.defaultProjectId) return false;
    const index = this.projects.findIndex((project) => project.id === projectId);
    if (index === -1) return false;
    this.projects.splice(index, 1);
    return true;
  }

  getProject(projectId) {
    return this.projects.find((project) => project.id === projectId) ?? null;
  }

  renameProject(projectId, newName) {
    const project = this.getProject(projectId);
    const trimmed = newName.trim();
    if (!project || !trimmed) return false;
    const duplicate = this.projects.some(
      (other) => other.id !== projectId && other.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return false;
    project.name = trimmed;
    return true;
  }

  addTask(projectId, taskData) {
    const project = this.getProject(projectId) ?? this.defaultProject;
    return project.addTask(taskData);
  }

  getTask(projectId, taskId) {
    return this.getProject(projectId)?.getTask(taskId) ?? null;
  }

  removeTask(projectId, taskId) {
    return this.getProject(projectId)?.removeTask(taskId) ?? null;
  }

  findTask(taskId) {
    for (const project of this.projects) {
      const task = project.getTask(taskId);
      if (task) return { project, task };
    }
    return null;
  }

  allTasks() {
    return this.projects.flatMap((project) =>
      project.tasks.map((task) => ({ project, task })),
    );
  }

  static fromJSON(data) {
    const list = new ProjectList();
    list.projects = (data.projects ?? []).map(Project.fromJSON);
    list.defaultProjectId = data.defaultProjectId ?? null;
    list.ensureDefaultProject();
    return list;
  }
}

export default ProjectList;
