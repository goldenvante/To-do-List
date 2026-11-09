export const STORAGE_KEY = "todoAppData";

export function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error("No se pudieron cargar las tareas guardadas.", error);
        return null;
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("No se pudieron guardar las tareas.", error);
    }
}
