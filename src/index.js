import './style.css';
import initUI from './modules/ui.js';
import { loadProjects, saveProjects } from './modules/storage.js';

const projectList = loadProjects();

initUI({
  projectList,
  onChange: () => saveProjects(projectList),
});
