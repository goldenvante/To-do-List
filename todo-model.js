export class Todo {
    constructor({
        id = crypto.randomUUID(),
        title,
        description = "",
        dueDate = "",
        priority = "medium",
        notes = "",
        completed = false,
        checklist = []
    }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.priority = priority;
        this.notes = notes;
        this.completed = completed;
        this.checklist = checklist;
    }

    update(values) {
        Object.assign(this, values);
    }

    toggleCompleted() {
        this.completed = !this.completed;
    }
}

export class Project {
    constructor({ id = crypto.randomUUID(), name, todos = [] }) {
        this.id = id;
        this.name = name;
        this.todos = todos.map((todo) => new Todo(todo));
    }

    addTodo(todo) {
        this.todos.unshift(todo instanceof Todo ? todo : new Todo(todo));
    }

    deleteTodo(todoId) {
        this.todos = this.todos.filter((todo) => todo.id !== todoId);
    }
}

export class TodoApp {
    constructor(projects = []) {
        this.projects = projects.map((project) => new Project(project));
    }

    addProject(name) {
        const project = new Project({ name });
        this.projects.push(project);
        return project;
    }

    findProject(projectId) {
        return this.projects.find((project) => project.id === projectId);
    }

    findTodo(todoId) {
        for (const project of this.projects) {
            const todo = project.todos.find((item) => item.id === todoId);
            if (todo) return { todo, project };
        }
        return null;
    }

    deleteTodo(todoId) {
        const match = this.findTodo(todoId);
        if (match) match.project.deleteTodo(todoId);
    }

    moveTodo(todoId, targetProjectId) {
        const match = this.findTodo(todoId);
        const targetProject = this.findProject(targetProjectId);
        if (!match || !targetProject || match.project.id === targetProjectId) return;
        match.project.deleteTodo(todoId);
        targetProject.addTodo(match.todo);
    }

    toJSON() {
        return {
            projects: this.projects.map((project) => ({
                id: project.id,
                name: project.name,
                todos: project.todos
            }))
        };
    }
}

export function createDefaultState() {
    const personal = new Project({
        name: "Personal",
        todos: [
            new Todo({
                title: "Comprar frutas para la semana",
                description: "Manzanas, bananas y fresas.",
                dueDate: new Date().toISOString().slice(0, 10),
                priority: "medium",
                notes: ""
            })
        ]
    });
    const work = new Project({
        name: "Trabajo",
        todos: [
            new Todo({
                title: "Enviar propuesta de diseño",
                description: "Preparar el documento y enviarlo al equipo.",
                dueDate: new Date().toISOString().slice(0, 10),
                priority: "high",
                notes: ""
            })
        ]
    });
    return new TodoApp([personal, work]);
}
