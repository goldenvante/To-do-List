import { TodoApp, Todo, createDefaultState } from "./todo-model.js";
import { loadState, saveState } from "./storage.js";

const savedState = loadState();
let todoApp = savedState?.projects?.length ? new TodoApp(savedState.projects) : createDefaultState();
let activeProjectId = todoApp.projects[0].id;
let activeView = `project:${activeProjectId}`;
let editingTodoId = null;

const taskBoard = document.querySelector("#task-board");
const viewTitle = document.querySelector("#view-title");
const taskModal = document.querySelector("#task-modal");
const taskForm = document.querySelector("#task-form");
const taskId = document.querySelector("#task-id");
const taskTitle = document.querySelector("#task-title-input");
const taskDescription = document.querySelector("#task-description-input");
const taskDueDate = document.querySelector("#task-due-date-input");
const taskPriority = document.querySelector("#task-priority-input");
const taskProject = document.querySelector("#task-project-input");
const taskNotes = document.querySelector("#task-notes-input");
const projectModal = document.querySelector("#project-modal");

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function persist() {
    saveState(todoApp.toJSON());
}

function formatDate(value) {
    if (!value) return "Sin fecha";
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date);
}

function priorityLabel(priority) {
    return { low: "Baja", medium: "Media", high: "Alta" }[priority] || "Media";
}

function allTodos() {
    return todoApp.projects.flatMap((project) => project.todos.map((todo) => ({ todo, project })));
}

function visibleTodos() {
    const today = new Date().toISOString().slice(0, 10);
    if (activeView === "today") return allTodos().filter(({ todo }) => !todo.completed && todo.dueDate === today);
    if (activeView === "scheduled") return allTodos().filter(({ todo }) => todo.dueDate && !todo.completed);
    if (activeView === "all") return allTodos();
    if (activeView === "completed") return allTodos().filter(({ todo }) => todo.completed);


    const projectId = activeView.replace("project:", "");
    const project = todoApp.findProject(projectId);
    return project ? project.todos.map((todo) => ({ todo, project })) : [];
}

function updateViewTitle() {
    const titles = { today: "Hoy", scheduled: "Programados", all: "Todos", completed: "Completados" };
    if (titles[activeView]) viewTitle.textContent = titles[activeView];
    else viewTitle.textContent = todoApp.findProject(activeView.replace("project:", ""))?.name || "Proyecto";
}

function renderProjects() {
    const projectList = document.querySelector("#project-list");
    projectList.innerHTML = todoApp.projects.map((project) => `
        <button class="list-item${activeView === `project:${project.id}` ? " active-list" : ""}" type="button" data-project-id="${project.id}">
            <span class="list-dot blue-dot"></span>
            <span>${escapeHtml(project.name)}</span>
            <span class="list-count">${project.todos.length}</span>
        </button>
    `).join("");

    taskProject.innerHTML = todoApp.projects.map((project) =>
        `<option value="${project.id}">${escapeHtml(project.name)}</option>`
    ).join("");
}

function renderCounts() {
    const todos = allTodos();
    const today = new Date().toISOString().slice(0, 10);
    document.querySelector("#all-count").textContent = todos.length;
    document.querySelector("#completed-count").textContent = todos.filter(({ todo }) => todo.completed).length;
    document.querySelector("#today-count").textContent = todos.filter(({ todo }) => !todo.completed && todo.dueDate === today).length;
    document.querySelector("#scheduled-count").textContent = todos.filter(({ todo }) => todo.dueDate && !todo.completed).length;
}

function renderTasks() {
    const items = visibleTodos();
    updateViewTitle();

    if (!items.length) {
        taskBoard.innerHTML = '<div class="empty-state"><p>No hay tareas en esta vista.</p></div>';
    } else {
        taskBoard.innerHTML = items.map(({ todo, project }) => `
            <article class="task-row priority-${todo.priority}${todo.completed ? " completed" : ""}" data-todo-id="${todo.id}">
                <button class="task-check" type="button" aria-label="${todo.completed ? "Marcar pendiente" : "Marcar completada"}">${todo.completed ? "✓" : ""}</button>
                <button class="task-details" type="button">
                    <span class="task-title">${escapeHtml(todo.title)}</span>
                    <span class="task-meta">${escapeHtml(formatDate(todo.dueDate))} · ${escapeHtml(project.name)}</span>
                </button>
                <span class="task-tag">${priorityLabel(todo.priority)}</span>
            </article>
        `).join("");
    }

    renderProjects();
    renderCounts();
}

function openTask(todoId = null) {
    editingTodoId = todoId;
    const match = todoId ? todoApp.findTodo(todoId) : null;
    const todo = match?.todo;

    document.querySelector("#task-modal-title").textContent = todo ? "Editar tarea" : "Nueva tarea";
    document.querySelector("#delete-task").hidden = !todo;
    taskId.value = todo?.id || "";
    taskTitle.value = todo?.title || "";
    taskDescription.value = todo?.description || "";
    taskDueDate.value = todo?.dueDate || "";
    taskPriority.value = todo?.priority || "medium";
    taskNotes.value = todo?.notes || "";
    taskProject.value = todo ? match.project.id : activeProjectId;
    taskModal.showModal();
    taskTitle.focus();
}

document.querySelector("#open-task-form").addEventListener("click", () => openTask());
document.querySelector("#close-task").addEventListener("click", () => taskModal.close());

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = {
        title: taskTitle.value.trim(),
        description: taskDescription.value.trim(),
        dueDate: taskDueDate.value,
        priority: taskPriority.value,
        notes: taskNotes.value.trim()
    };
    if (!values.title) return;

    const existing = editingTodoId ? todoApp.findTodo(editingTodoId) : null;
    if (existing) {
        existing.todo.update(values);
        todoApp.moveTodo(existing.todo.id, taskProject.value);
    } else {
        const project = todoApp.findProject(taskProject.value) || todoApp.projects[0];
        project.addTodo(new Todo(values));
        activeProjectId = project.id;
    }
    persist();
    taskModal.close();
    renderTasks();
});

taskBoard.addEventListener("click", (event) => {
    const row = event.target.closest(".task-row");
    if (!row) return;

    if (event.target.closest(".task-check")) {
        const match = todoApp.findTodo(row.dataset.todoId);
        if (match) {
            match.todo.toggleCompleted();
            persist();
            renderTasks();
        }
    } else if (event.target.closest(".task-details")) {
        openTask(row.dataset.todoId);
    }
});

document.querySelector("#delete-task").addEventListener("click", () => {
    if (!editingTodoId) return;
    todoApp.deleteTodo(editingTodoId);
    persist();
    taskModal.close();
    renderTasks();
});

document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
        activeView = button.dataset.filter;
        document.querySelectorAll("[data-filter], [data-project-id]").forEach((item) => item.classList.remove("active", "active-list"));
        button.classList.add("active");
        renderTasks();
    });
});

document.querySelector("#project-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-id]");
    if (!button) return;
    activeView = `project:${button.dataset.projectId}`;
    activeProjectId = button.dataset.projectId;
    document.querySelectorAll("[data-filter], [data-project-id]").forEach((item) => item.classList.remove("active", "active-list"));
    button.classList.add("active-list");
    renderTasks();
});

document.querySelector("#add-project-button").addEventListener("click", () => {
    document.querySelector("#project-name-input").value = "";
    projectModal.showModal();
});
document.querySelector("#close-project").addEventListener("click", () => projectModal.close());
document.querySelector("#project-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#project-name-input").value.trim();
    if (!name) return;
    const project = todoApp.addProject(name);
    activeProjectId = project.id;
    activeView = `project:${project.id}`;
    persist();
    projectModal.close();
    renderTasks();
});

const profileButton = document.querySelector("#profile-button");
const profileModal = document.querySelector("#profile-modal");
const profileForm = document.querySelector("#profile-form");
const profilePhoto = document.querySelector("#profile-photo");
const profilePreview = document.querySelector("#profile-preview");
const profileName = document.querySelector("#profile-name");
const profileBirthdate = document.querySelector("#profile-birthdate");
const profileGender = document.querySelector("#profile-gender");

let profile = JSON.parse(localStorage.getItem("todoProfile") || "null") || { name: "Fernanda", birthdate: "", gender: "", photo: "" };
let pendingPhoto = profile.photo;

function initial(name) {
    return name.trim().charAt(0).toUpperCase() || "F";
}

function applyProfile() {
    profileButton.textContent = initial(profile.name);
    profilePreview.textContent = initial(profile.name);
    [profileButton, profilePreview].forEach((element) => {
        if (profile.photo) {
            element.classList.add("has-photo");
            element.style.backgroundImage = `url("${profile.photo}")`;
        } else {
            element.classList.remove("has-photo");
            element.style.backgroundImage = "";
        }
    });
}

profileButton.addEventListener("click", () => {
    profileName.value = profile.name;
    profileBirthdate.value = profile.birthdate;
    profileGender.value = profile.gender;
    pendingPhoto = profile.photo;
    applyProfile();
    profileModal.showModal();
});
document.querySelector("#close-profile").addEventListener("click", () => profileModal.close());
profilePhoto.addEventListener("change", () => {
    const file = profilePhoto.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        pendingPhoto = reader.result;
        profilePreview.classList.add("has-photo");
        profilePreview.style.backgroundImage = `url("${pendingPhoto}")`;
    });
    reader.readAsDataURL(file);
});
profileName.addEventListener("input", () => {
    if (!pendingPhoto) profilePreview.textContent = initial(profileName.value);
});
profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    profile = { name: profileName.value.trim() || "Fernanda", birthdate: profileBirthdate.value, gender: profileGender.value, photo: pendingPhoto };
    localStorage.setItem("todoProfile", JSON.stringify(profile));
    applyProfile();
    profileModal.close();
});

document.querySelector("#date-label").textContent = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
}).format(new Date());

applyProfile();
renderTasks();
