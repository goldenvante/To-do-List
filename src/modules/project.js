import Task from './task.js';

class Project {
  constructor(name, id = crypto.randomUUID()) {
    this.id = id;
    this.name = name;
    this.tasks = [];
  }

  addTask(taskData) {
    const task = taskData instanceof Task ? taskData : new Task(taskData);
    this.tasks.push(task);
    return task;
  }

  getTask(taskId) {
    return this.tasks.find((task) => task.id === taskId) ?? null;
  }

  removeTask(taskId) {
    const index = this.tasks.findIndex((task) => task.id === taskId);
    if (index === -1) return null;
    return this.tasks.splice(index, 1)[0];
  }

  static fromJSON(data) {
    const project = new Project(data.name ?? '', data.id);
    project.tasks = (data.tasks ?? []).map(Task.fromJSON);
    return project;
  }
}

export default Project;
