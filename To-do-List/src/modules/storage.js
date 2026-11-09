import ProjectList from './projectList.js';

const STORAGE_KEY = 'todoList.projects';

export function saveProjects(projectList) {
  try {
    const data = {
      projects: projectList.projects,
      defaultProjectId: projectList.defaultProjectId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('No se pudieron guardar los datos en localStorage.', error);
    return false;
  }
}

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new ProjectList();

    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.projects)) return new ProjectList();

    return ProjectList.fromJSON(data);
  } catch (error) {
    console.warn('No se pudieron leer los datos de localStorage.', error);
    return new ProjectList();
  }
}
