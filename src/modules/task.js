import { isBefore, parseISO, startOfToday } from 'date-fns';

class Task {
  constructor({
    id = crypto.randomUUID(),
    title,
    description = '',
    dueDate = '',
    priority = 'low',
    notes = '',
    checklist = [],
    completed = false,
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.priority = priority;
    this.notes = notes;
    this.checklist = checklist;
    this.completed = completed;
  }

  toggleComplete() {
    this.completed = !this.completed;
    return this.completed;
  }

  changePriority(priority) {
    this.priority = priority;
  }

  update({ title, description, dueDate, priority, notes }) {
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
    this.priority = priority;
    this.notes = notes;
  }

  addChecklistItem(text) {
    this.checklist.push({ text, done: false });
  }

  toggleChecklistItem(index) {
    const item = this.checklist[index];
    if (item) item.done = !item.done;
  }

  updateChecklistItem(index, text) {
    const item = this.checklist[index];
    const trimmed = text.trim();
    if (item && trimmed) item.text = trimmed;
  }

  removeChecklistItem(index) {
    if (index >= 0 && index < this.checklist.length) {
      this.checklist.splice(index, 1);
    }
  }

  isOverdue() {
    if (!this.dueDate || this.completed) return false;
    return isBefore(parseISO(this.dueDate), startOfToday());
  }

  static fromJSON(data) {
    return Object.assign(new Task({ title: data.title ?? '' }), data);
  }
}

export default Task;
