import { differenceInCalendarDays, format, parseISO, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

const ALL_TASKS_ID = '__all__';
const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

let projectList;
let onChange = () => {};
let currentProjectId = null;
let expandedTaskId = null;
let editingTaskId = null;
let editingCheck = null;
let renamingProjectId = null;
let createFormOpen = false;
let showCompleted = true;
let sortBy = 'original';

const els = {};

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function dueLabel(task) {
  if (!task.dueDate) return { text: 'Sin fecha', state: '' };
  const due = parseISO(task.dueDate);
  if (Number.isNaN(due.getTime())) return { text: task.dueDate, state: '' };
  if (task.completed) return { text: format(due, 'd MMM yyyy', { locale: es }), state: '' };

  const days = differenceInCalendarDays(due, startOfToday());
  if (days < 0) {
    const n = Math.abs(days);
    return { text: n === 1 ? 'Vencida ayer' : `Vencida hace ${n} días`, state: 'overdue' };
  }
  if (days === 0) return { text: 'Vence hoy', state: 'today' };
  if (days === 1) return { text: 'Vence mañana', state: 'soon' };
  if (days <= 7) return { text: `En ${days} días`, state: 'soon' };
  return { text: format(due, 'd MMM yyyy', { locale: es }), state: '' };
}

function subtitleText(tasks) {
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const capitalized = today.charAt(0).toUpperCase() + today.slice(1);
  const pending = tasks.filter((task) => !task.completed).length;
  const overdue = tasks.filter((task) => task.isOverdue()).length;
  const parts = [capitalized, `${pending} pendiente${pending === 1 ? '' : 's'}`];
  if (overdue > 0) parts.push(`${overdue} vencida${overdue === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function priorityOptions(selected) {
  return Object.entries(PRIORITY_LABELS)
    .map(
      ([value, label]) =>
        `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`,
    )
    .join('');
}

function fieldsHTML(task = {}) {
  const { title = '', description = '', dueDate = '', priority = 'low', notes = '' } = task;
  return `
    <label>Título
      <input type="text" name="title" required maxlength="100" value="${escapeHTML(title)}">
    </label>
    <label>Descripción
      <textarea name="description" maxlength="500">${escapeHTML(description)}</textarea>
    </label>
    <label>Fecha de vencimiento
      <input type="date" name="dueDate" value="${escapeHTML(dueDate)}">
    </label>
    <label>Prioridad
      <select name="priority">${priorityOptions(priority)}</select>
    </label>
    <label>Notas
      <textarea name="notes" maxlength="500">${escapeHTML(notes)}</textarea>
    </label>`;
}

function checklistItemHTML(task, item, index) {
  const editing = editingCheck && editingCheck.taskId === task.id && editingCheck.index === index;
  if (editing) {
    return `<li><input class="check-item-input" type="text" maxlength="100" value="${escapeHTML(item.text)}" data-index="${index}"></li>`;
  }
  return `
    <li>
      <label class="check-item">
        <input type="checkbox" class="checklist-check" data-index="${index}" ${item.done ? 'checked' : ''}>
        <span class="check-item-text" data-index="${index}">${escapeHTML(item.text)}</span>
      </label>
      <button type="button" class="remove-check-item" data-action="remove-check-item" data-index="${index}" title="Eliminar elemento" aria-label="Eliminar elemento">&times;</button>
    </li>`;
}

function detailsHTML(task) {
  return `
    <div class="task-details">
      <p>${task.description ? escapeHTML(task.description) : 'Sin descripción'}</p>
      ${task.notes ? `<p class="task-notes"><strong>Notas:</strong> ${escapeHTML(task.notes)}</p>` : ''}
      <div class="detail-row">
        <label>Prioridad
          <select class="priority-select" data-action="priority">${priorityOptions(task.priority)}</select>
        </label>
      </div>
      <div class="checklist">
        <h4>Checklist</h4>
        <ul class="checklist-items">
          ${task.checklist.map((item, index) => checklistItemHTML(task, item, index)).join('')}
        </ul>
        <form class="checklist-form">
          <input type="text" name="item" placeholder="Añadir elemento" maxlength="100">
          <button type="submit" class="secondary-btn">Añadir</button>
        </form>
      </div>
      <div class="task-actions">
        <button type="button" class="secondary-btn" data-action="edit">Editar</button>
        <button type="button" class="danger-btn" data-action="delete">Eliminar</button>
      </div>
    </div>`;
}

function editFormHTML(task) {
  return `
    <form class="task-edit-form" data-task-id="${task.id}">
      <div class="form-fields">${fieldsHTML(task)}</div>
      <div class="form-actions">
        <button type="submit" class="primary-btn">Guardar</button>
        <button type="button" class="secondary-btn" data-action="cancel-edit">Cancelar</button>
      </div>
    </form>`;
}

function taskHTML(task, project, showProjectName) {
  const expanded = task.id === expandedTaskId;
  const editing = task.id === editingTaskId;
  const due = dueLabel(task);
  return `
    <li class="task priority-${task.priority} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
      <div class="task-row" data-action="toggle">
        <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''} aria-label="Marcar como completada">
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${showProjectName ? `<span class="task-project">${escapeHTML(project.name)}</span>` : ''}
        <span class="task-due ${due.state}">${due.text}</span>
        <span class="task-priority priority-${task.priority}">${PRIORITY_LABELS[task.priority] ?? task.priority}</span>
      </div>
      ${expanded ? (editing ? editFormHTML(task) : detailsHTML(task)) : ''}
    </li>`;
}

function emptyHTML(message) {
  return `
    <li class="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4.5" y="3.5" width="15" height="17" rx="2"></rect>
        <path d="M8 9h8"></path>
        <path d="M8 13h5"></path>
        <path d="M8.5 16.5l2 2 4.5-4.5"></path>
      </svg>
      <p>${message}</p>
    </li>`;
}

function visibleItems(items) {
  let visible = showCompleted ? items : items.filter(({ task }) => !task.completed);
  if (sortBy === 'dueDate') {
    visible = [...visible].sort((a, b) =>
      (a.task.dueDate || '9999-99-99').localeCompare(b.task.dueDate || '9999-99-99'),
    );
  } else if (sortBy === 'priority') {
    visible = [...visible].sort(
      (a, b) => PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority],
    );
  }
  return visible;
}

function renderProjects() {
  const totalPending = projectList.allTasks().filter(({ task }) => !task.completed).length;
  const allActive = currentProjectId === ALL_TASKS_ID ? 'active' : '';

  const allItem = `
    <li class="project-item all-tasks ${allActive}">
      <button type="button" class="project-btn" data-project-id="${ALL_TASKS_ID}">
        <span class="project-name">All task´s</span>
        <span class="project-count">${totalPending}</span>
      </button>
    </li>`;

  const projectItems = projectList.projects
    .map((project) => {
      const pending = project.tasks.filter((task) => !task.completed).length;
      const active = project.id === currentProjectId ? 'active' : '';
      const isRenaming = renamingProjectId === project.id;

      const main = isRenaming
        ? `<input class="rename-input" type="text" maxlength="50" value="${escapeHTML(project.name)}" data-project-id="${project.id}">`
        : `<button type="button" class="project-btn" data-project-id="${project.id}">
            <span class="project-name">${escapeHTML(project.name)}</span>
            <span class="project-count">${pending}</span>
          </button>`;

      const tools = `
        <span class="item-tools">
          ${isRenaming ? '' : `<button type="button" class="rename-project-btn" data-project-id="${project.id}" title="Renombrar proyecto" aria-label="Renombrar proyecto">&#9998;</button>`}
          ${project.id !== projectList.defaultProjectId ? `<button type="button" class="delete-project-btn" data-project-id="${project.id}" title="Eliminar proyecto" aria-label="Eliminar proyecto">&times;</button>` : ''}
        </span>`;

      return `<li class="project-item ${active}">${main}${tools}</li>`;
    })
    .join('');

  els.projectList.innerHTML = allItem + projectItems;
}

function renderTasks() {
  const isAll = currentProjectId === ALL_TASKS_ID;
  const project = isAll ? null : projectList.getProject(currentProjectId) ?? projectList.defaultProject;
  if (project) currentProjectId = project.id;

  const items = isAll ? projectList.allTasks() : project.tasks.map((task) => ({ project, task }));
  const projectTasks = items.map(({ task }) => task);

  els.currentProjectName.textContent = isAll ? 'Todas las tareas' : project.name;
  els.projectSubtitle.textContent = subtitleText(projectTasks);
  els.taskForm.hidden = !createFormOpen;

  const visible = visibleItems(items);

  if (visible.length === 0) {
    els.taskList.innerHTML =
      projectTasks.length === 0
        ? emptyHTML(
            isAll
              ? 'No task '
              : 'No task in this project. Click in + to add new task.',
          )
        : emptyHTML('Ninguna tarea coincide con los filtros actuales.');
    return;
  }

  els.taskList.innerHTML = visible
    .map(({ project: fromProject, task }) => taskHTML(task, fromProject, isAll))
    .join('');
}

function render() {
  renderProjects();
  renderTasks();
}

function cancelRename() {
  renamingProjectId = null;
  renderProjects();
}

function trySaveRename(input) {
  const projectId = input.dataset.projectId;
  if (renamingProjectId !== projectId) return;
  const value = input.value.trim();
  if (!value) {
    cancelRename();
    return;
  }
  if (!projectList.renameProject(projectId, value)) {
    input.classList.add('invalid');
    input.focus();
    return;
  }
  renamingProjectId = null;
  render();
  onChange();
}

function saveCheckEdit(input) {
  const taskEl = input.closest('[data-task-id]');
  const index = Number(input.dataset.index);
  if (!taskEl || !editingCheck) return;
  if (editingCheck.taskId !== taskEl.dataset.taskId || editingCheck.index !== index) return;

  const found = projectList.findTask(editingCheck.taskId);
  editingCheck = null;
  if (!found) return;

  const text = input.value.trim();
  if (text) {
    found.task.updateChecklistItem(index, text);
    renderTasks();
    onChange();
  } else {
    renderTasks();
  }
}

function handleProjectSubmit(e) {
  e.preventDefault();
  const project = projectList.addProject(els.projectNameInput.value);
  if (project) {
    currentProjectId = project.id;
    expandedTaskId = null;
    editingTaskId = null;
    editingCheck = null;
    renamingProjectId = null;
    createFormOpen = false;
  }
  els.projectForm.reset();
  els.projectForm.hidden = true;
  render();
  onChange();
}

function handleProjectListClick(e) {
  const renameBtn = e.target.closest('.rename-project-btn');
  if (renameBtn) {
    renamingProjectId = renameBtn.dataset.projectId;
    renderProjects();
    const input = els.projectList.querySelector('.rename-input');
    if (input) {
      input.focus();
      input.select();
    }
    return;
  }

  const deleteBtn = e.target.closest('.delete-project-btn');
  if (deleteBtn) {
    const projectId = deleteBtn.dataset.projectId;
    if (!confirm('Delete the project and all task?')) return;
    const removed = projectList.removeProject(projectId);
    if (removed) {
      if (currentProjectId === projectId) currentProjectId = projectList.defaultProjectId;
      if (renamingProjectId === projectId) renamingProjectId = null;
      expandedTaskId = null;
      editingTaskId = null;
      editingCheck = null;
      createFormOpen = false;
      render();
      onChange();
    }
    return;
  }

  const projectBtn = e.target.closest('.project-btn');
  if (!projectBtn) return;
  currentProjectId = projectBtn.dataset.projectId;
  expandedTaskId = null;
  editingTaskId = null;
  editingCheck = null;
  renamingProjectId = null;
  createFormOpen = false;
  render();
}

function handleCreateTask(e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(els.taskForm));
  projectList.addTask(currentProjectId, data);
  els.taskForm.reset();
  createFormOpen = false;
  render();
  onChange();
}

function handleTaskListClick(e) {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const taskEl = actionEl.closest('[data-task-id]');
  if (!taskEl) return;
  const taskId = taskEl.dataset.taskId;

  if (action === 'toggle') {
    if (e.target.matches('input, select, textarea, button')) return;
    if (editingTaskId === taskId) return;
    editingTaskId = null;
    editingCheck = null;
    expandedTaskId = expandedTaskId === taskId ? null : taskId;
    renderTasks();
    return;
  }

  const found = projectList.findTask(taskId);
  if (!found) return;

  if (action === 'edit') {
    editingTaskId = taskId;
    expandedTaskId = taskId;
    editingCheck = null;
    renderTasks();
  } else if (action === 'cancel-edit') {
    editingTaskId = null;
    editingCheck = null;
    renderTasks();
  } else if (action === 'remove-check-item') {
    found.task.removeChecklistItem(Number(actionEl.dataset.index));
    editingCheck = null;
    renderTasks();
    onChange();
  } else if (action === 'delete') {
    if (!confirm(`Delete the task "${found.task.title}"?`)) return;
    projectList.removeTask(found.project.id, taskId);
    if (expandedTaskId === taskId) expandedTaskId = null;
    if (editingTaskId === taskId) editingTaskId = null;
    editingCheck = null;
    render();
    onChange();
  }
}

function handleTaskListChange(e) {
  const target = e.target;
  const taskEl = target.closest('[data-task-id]');
  if (!taskEl) return;
  const found = projectList.findTask(taskEl.dataset.taskId);
  if (!found) return;

  if (target.classList.contains('task-check')) {
    found.task.toggleComplete();
    render();
    onChange();
  } else if (target.classList.contains('checklist-check')) {
    found.task.toggleChecklistItem(Number(target.dataset.index));
    renderTasks();
    onChange();
  } else if (target.classList.contains('priority-select')) {
    found.task.changePriority(target.value);
    renderTasks();
    onChange();
  }
}

function handleTaskListSubmit(e) {
  const editForm = e.target.closest('.task-edit-form');
  if (editForm) {
    e.preventDefault();
    const found = projectList.findTask(editForm.dataset.taskId);
    if (!found) return;
    found.task.update(Object.fromEntries(new FormData(editForm)));
    editingTaskId = null;
    editingCheck = null;
    renderTasks();
    onChange();
    return;
  }

  const checklistForm = e.target.closest('.checklist-form');
  if (checklistForm) {
    e.preventDefault();
    const taskEl = checklistForm.closest('[data-task-id]');
    const found = projectList.findTask(taskEl.dataset.taskId);
    if (!found) return;
    const text = String(new FormData(checklistForm).get('item') ?? '').trim();
    if (!text) return;
    found.task.addChecklistItem(text);
    editingCheck = null;
    renderTasks();
    onChange();
  }
}

function bindEvents() {
  els.addProjectBtn.addEventListener('click', () => {
    els.projectForm.hidden = false;
    els.projectNameInput.focus();
  });

  els.cancelProjectBtn.addEventListener('click', () => {
    els.projectForm.hidden = true;
    els.projectForm.reset();
  });

  els.projectForm.addEventListener('submit', handleProjectSubmit);
  els.projectList.addEventListener('click', handleProjectListClick);

  els.projectList.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('rename-input')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      trySaveRename(e.target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  });

  els.projectList.addEventListener('focusout', (e) => {
    if (e.target.classList?.contains('rename-input')) trySaveRename(e.target);
  });

  els.addTaskBtn.addEventListener('click', () => {
    createFormOpen = !createFormOpen;
    editingTaskId = null;
    renderTasks();
    if (createFormOpen) els.taskForm.querySelector('input[name="title"]').focus();
  });

  els.taskForm.addEventListener('submit', handleCreateTask);
  els.taskForm.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="cancel-create"]')) {
      createFormOpen = false;
      renderTasks();
    }
  });

  els.showCompleted.addEventListener('change', () => {
    showCompleted = els.showCompleted.checked;
    renderTasks();
  });

  els.sortSelect.addEventListener('change', () => {
    sortBy = els.sortSelect.value;
    renderTasks();
  });

  els.taskList.addEventListener('click', handleTaskListClick);
  els.taskList.addEventListener('change', handleTaskListChange);
  els.taskList.addEventListener('submit', handleTaskListSubmit);

  els.taskList.addEventListener('dblclick', (e) => {
    const textEl = e.target.closest('.check-item-text');
    if (!textEl) return;
    const taskEl = textEl.closest('[data-task-id]');
    editingCheck = {
      taskId: taskEl.dataset.taskId,
      index: Number(textEl.dataset.index),
    };
    renderTasks();
    const input = els.taskList.querySelector('.check-item-input');
    if (input) {
      input.focus();
      input.select();
    }
  });

  els.taskList.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('check-item-input')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCheckEdit(e.target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editingCheck = null;
      renderTasks();
    }
  });

  els.taskList.addEventListener('focusout', (e) => {
    if (e.target.classList?.contains('check-item-input')) saveCheckEdit(e.target);
  });
}

function initUI({ projectList: list, onChange: change = () => {} }) {
  projectList = list;
  onChange = change;
  currentProjectId = projectList.defaultProjectId;

  els.projectList = document.querySelector('#project-list');
  els.projectForm = document.querySelector('#project-form');
  els.projectNameInput = document.querySelector('#project-name-input');
  els.addProjectBtn = document.querySelector('#add-project-btn');
  els.cancelProjectBtn = document.querySelector('#cancel-project-btn');
  els.currentProjectName = document.querySelector('#current-project-name');
  els.projectSubtitle = document.querySelector('#project-subtitle');
  els.addTaskBtn = document.querySelector('#add-task-btn');
  els.showCompleted = document.querySelector('#show-completed');
  els.sortSelect = document.querySelector('#sort-select');
  els.taskForm = document.querySelector('#task-form');
  els.taskList = document.querySelector('#task-list');

  els.taskForm.innerHTML = `
    <div class="form-fields">${fieldsHTML()}</div>
    <div class="form-actions">
      <button type="submit" class="primary-btn">Crear tarea</button>
      <button type="button" class="secondary-btn" data-action="cancel-create">Cancelar</button>
    </div>`;

  bindEvents();
  render();
}

export default initUI;
